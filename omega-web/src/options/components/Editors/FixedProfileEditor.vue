<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { isFirefox } from '@/services/chrome';
import { getMessage as $t } from '@/services/chrome/i18n';
import ProxyAuthModal from '@/options/components/Modals/ProxyAuthModal.vue';

const profile = defineModel<any>('profile', { required: true });
defineProps<{ profileName: string }>();
const optionsStore = useOptionsStore();

const showAdvanced = ref(false);
const showAuthModal = ref(false);
const authScheme = ref('');

const urlSchemes = ['', 'http', 'https', 'ftp'];
const schemeDisp: Record<string, string> = {
  '': $t('options_scheme_default') || 'Default',
  http: 'HTTP',
  https: 'HTTPS',
  ftp: 'FTP',
};
const schemeProps: Record<string, string> = {
  '': 'fallbackProxy',
  http: 'proxyForHttp',
  https: 'proxyForHttps',
  ftp: 'proxyForFtp',
};

const defaultPort: Record<string, number> = {
  http: 80,
  https: 443,
  socks4: 1080,
  socks5: 1080,
};

const authSupported: Record<string, boolean> = {
  http: true,
  https: true,
  socks5: !isFirefox,
};

const prevProxySchemes: Record<string, string | undefined> = {};
urlSchemes.forEach((s) => { prevProxySchemes[s] = undefined; });

// Initialize prevProxySchemes from existing profile data
watch(() => profile.value, () => {
  if (profile.value) {
    urlSchemes.forEach((s) => {
      const prop = schemeProps[s];
      prevProxySchemes[s] = profile.value[prop]?.scheme ?? undefined;
    });
  }
}, { immediate: true });

const protocols = [
  { value: '', label: `(${  $t('options_proxy_scheme_default') || 'same as default'  })` },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
];
const defaultProtocols = [
  { value: undefined, label: $t('options_protocol_direct') || 'Direct' },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
];

function getProxy(scheme: string): any {
  const prop = schemeProps[scheme];
  profile.value[prop] ??= { host: '', port: null, scheme: 'http' };
  return profile.value[prop];
}

function getProtocolOptions(scheme: string) {
  return scheme === '' ? defaultProtocols : protocols;
}

function isProxyActive(scheme: string): boolean {
  if (scheme === '') {
    return getProxy(scheme).scheme != null;
  }
  return !!getProxy(scheme).scheme;
}

function handleSchemeChange(scheme: string) {
  const proxy = getProxy(scheme);
  const prevScheme = prevProxySchemes[scheme];
  const newScheme = proxy.scheme;

  // Fix 4: Clear auth when switching to a scheme that doesn't support proxy auth
  if (newScheme && !authSupported[newScheme]) {
    delete proxy.username;
    delete proxy.password;
  }

  // Fix 1 & 2: First time selecting a specific scheme — auto-fill port and host
  if (newScheme && !prevScheme) {
    const fallback = getProxy('');

    if (!proxy.port) {
      if (newScheme === fallback.scheme && fallback.port != null) {
        proxy.port = fallback.port;
      } else {
        proxy.port = defaultPort[newScheme] ?? null;
      }
    }

    proxy.host ??= fallback.host ?? 'example.com';
  }

  // For non-fallback schemes, clear the profile property when scheme is unset
  if (!newScheme && scheme !== '') {
    delete profile.value[schemeProps[scheme]];
  }

  prevProxySchemes[scheme] = newScheme ?? undefined;
  optionsStore.markDirty();
}

function isProxyAuthActive(scheme: string): boolean {
  const prop = schemeProps[scheme];
  const proxy = profile.value[prop];
  return !!(proxy?.username);
}

function openAuthModal(scheme: string) {
  authScheme.value = scheme;
  showAuthModal.value = true;
}

function saveAuth(auth: { username: string; password: string } | null) {
  const prop = schemeProps[authScheme.value];
  if (!profile.value[prop]) return;
  if (!auth) {
    delete profile.value[prop].username;
    delete profile.value[prop].password;
  } else {
    profile.value[prop].username = auth.username;
    profile.value[prop].password = auth.password;
  }
  optionsStore.markDirty();
}

const bypassList = computed({
  get: () => {
    const list = profile.value.bypassList ?? [];
    return list.map((item: any) => {
      if (typeof item === 'string') return item;
      return item.pattern ?? '';
    }).join('\n');
  },
  set: (val: string) => {
    if (val.trim()) {
      profile.value.bypassList = val.split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => ({ conditionType: 'BypassCondition', pattern: s }));
    } else {
      profile.value.bypassList = [];
    }
    optionsStore.markDirty();
  },
});
</script>

<template>
  <div>
    <section class="settings-group settings-group-fixed-servers">
      <h3>{{ $t('options_group_proxyServers') }}</h3>
      <div class="table-responsive">
        <table class="fixed-servers table table-bordered table-striped width-limit-lg">
          <thead>
            <tr>
              <th>{{ $t('options_proxy_scheme') }}</th>
              <th>{{ $t('options_proxy_protocol') }}</th>
              <th>{{ $t('options_proxy_server') }}</th>
              <th>{{ $t('options_proxy_port') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <template
              v-for="scheme in urlSchemes"
              :key="scheme"
            >
              <tr v-if="scheme === '' || showAdvanced">
                <!-- Scheme label -->
                <td>{{ schemeDisp[scheme] }}</td>
                <!-- Protocol -->
                <td>
                  <select
                    v-model="getProxy(scheme).scheme"
                    class="form-control"
                    @change="handleSchemeChange(scheme)"
                  >
                    <option
                      v-for="opt in getProtocolOptions(scheme)"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </td>
                <!-- Server -->
                <td>
                  <input
                    v-if="isProxyActive(scheme)"
                    v-model="getProxy(scheme).host"
                    class="form-control"
                    type="text"
                    required
                    @change="optionsStore.markDirty()"
                  >
                  <input
                    v-else
                    class="form-control"
                    type="text"
                    :placeholder="getProxy('').host"
                    disabled
                  >
                </td>
                <!-- Port -->
                <td>
                  <input
                    v-if="isProxyActive(scheme)"
                    v-model="getProxy(scheme).port"
                    class="form-control"
                    type="number"
                    min="1"
                    required
                    @change="optionsStore.markDirty()"
                  >
                  <input
                    v-else
                    class="form-control"
                    type="number"
                    :placeholder="String(getProxy('').port || '')"
                    disabled
                  >
                </td>
                <!-- Auth -->
                <td class="proxy-actions">
                  <button
                    class="btn btn-xs proxy-auth-toggle"
                    :class="isProxyAuthActive(scheme) ? 'btn-success' : 'btn-default'"
                    type="button"
                    :title="$t('options_proxy_auth')"
                    @click="openAuthModal(scheme)"
                  >
                    <span class="glyphicon glyphicon-lock" />
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
          <tbody v-if="!showAdvanced">
            <tr class="fixed-show-advanced">
              <td colspan="5">
                <button
                  class="btn btn-link"
                  @click="showAdvanced = true"
                >
                  <span class="glyphicon glyphicon-chevron-down" />
                  {{ $t('options_proxy_expand') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="settings-group">
      <h3>{{ $t('options_group_bypassList') }}</h3>
      <p class="help-block">
        {{ $t('options_bypassListHelp') }}
      </p>
      <p class="help-block">
        <a
          href="https://developer.chrome.com/extensions/proxy#bypass_list"
          target="_blank"
        >
          {{ $t('options_bypassListHelpLinkText') }}
        </a>
      </p>
      <textarea
        v-model.lazy="bypassList"
        class="monospace form-control width-limit"
        rows="10"
      />
    </section>

    <ProxyAuthModal
      v-if="showAuthModal"
      :auth="profile[schemeProps[authScheme]]"
      :proxy-scheme="getProxy(authScheme).scheme"
      @close="showAuthModal = false"
      @save="saveAuth($event)"
    />
  </div>
</template>
