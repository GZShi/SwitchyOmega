<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useOmegaTarget } from '@/composables/useOmegaTarget';
import { useOptionsStore } from '@/stores/options';
import ProxyAuthModal from '@/options/components/Modals/ProxyAuthModal.vue';

const props = defineProps<{ profile: any; profileName: string }>();
const omega = useOmegaTarget();
const optionsStore = useOptionsStore();

const showAdvanced = ref(false);
const showAuthModal = ref(false);
const authScheme = ref('');

const urlSchemes = ['', 'http', 'https', 'ftp'];
const schemeDisp: Record<string, string> = {
  '': omega.getMessage('options_scheme_default') || 'Default',
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
const protocols = [
  { value: '', label: '(' + (omega.getMessage('options_proxy_scheme_default') || 'same as default') + ')' },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
];
const defaultProtocols = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
];

function getProxy(scheme: string): any {
  const prop = schemeProps[scheme];
  if (!props.profile[prop]) {
    props.profile[prop] = { host: '', port: null, scheme: 'http' };
  }
  return props.profile[prop];
}

function getProtocolOptions(scheme: string) {
  return scheme === '' ? defaultProtocols : protocols;
}

function isProxyAuthActive(scheme: string): boolean {
  const prop = schemeProps[scheme];
  const proxy = props.profile[prop];
  return !!(proxy?.username);
}

function openAuthModal(scheme: string) {
  authScheme.value = scheme;
  showAuthModal.value = true;
}

function saveAuth(auth: { username: string; password: string } | null) {
  const prop = schemeProps[authScheme.value];
  if (!props.profile[prop]) return;
  if (!auth) {
    delete props.profile[prop].username;
    delete props.profile[prop].password;
  } else {
    props.profile[prop].username = auth.username;
    props.profile[prop].password = auth.password;
  }
  optionsStore.markDirty();
}

const bypassList = computed({
  get: () => {
    const list = props.profile.bypassList || [];
    return list.map((item: any) => {
      if (typeof item === 'string') return item;
      return item.pattern || '';
    }).join('\n');
  },
  set: (val: string) => {
    if (val.trim()) {
      props.profile.bypassList = val.split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => ({ conditionType: 'BypassCondition', pattern: s }));
    } else {
      props.profile.bypassList = [];
    }
    optionsStore.markDirty();
  },
});
</script>

<template>
  <div>
    <section class="settings-group settings-group-fixed-servers">
      <h3>{{ omega.getMessage('options_group_proxyServers') }}</h3>
      <div class="table-responsive">
        <table class="fixed-servers table table-bordered table-striped width-limit-lg">
          <thead>
            <tr>
              <th>{{ omega.getMessage('options_proxy_scheme') }}</th>
              <th>{{ omega.getMessage('options_proxy_protocol') }}</th>
              <th>{{ omega.getMessage('options_proxy_server') }}</th>
              <th>{{ omega.getMessage('options_proxy_port') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="scheme in urlSchemes" :key="scheme">
              <tr v-if="scheme === '' || showAdvanced">
                <!-- Scheme label -->
                <td>{{ schemeDisp[scheme] }}</td>
                <!-- Protocol -->
                <td>
                  <select class="form-control"
                          v-model="getProxy(scheme).scheme"
                          @change="optionsStore.markDirty()">
                    <option v-for="opt in getProtocolOptions(scheme)"
                            :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </td>
                <!-- Server -->
                <td>
                  <input v-if="getProxy(scheme).scheme || scheme === ''"
                         class="form-control" type="text"
                         v-model="getProxy(scheme).host"
                         required
                         @change="optionsStore.markDirty()" />
                  <input v-else class="form-control" type="text"
                         :placeholder="getProxy('').host" disabled />
                </td>
                <!-- Port -->
                <td>
                  <input v-if="getProxy(scheme).scheme || scheme === ''"
                         class="form-control" type="number" min="1"
                         v-model="getProxy(scheme).port"
                         required
                         @change="optionsStore.markDirty()" />
                  <input v-else class="form-control" type="number"
                         :placeholder="String(getProxy('').port || '')" disabled />
                </td>
                <!-- Auth -->
                <td class="proxy-actions">
                  <button class="btn btn-xs proxy-auth-toggle"
                          :class="isProxyAuthActive(scheme) ? 'btn-success' : 'btn-default'"
                          type="button"
                          :title="omega.getMessage('options_proxy_auth')"
                          @click="openAuthModal(scheme)">
                    <span class="glyphicon glyphicon-lock"></span>
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
          <tbody v-if="!showAdvanced">
            <tr class="fixed-show-advanced">
              <td colspan="5">
                <button class="btn btn-link" @click="showAdvanced = true">
                  <span class="glyphicon glyphicon-chevron-down"></span>
                  {{ omega.getMessage('options_proxy_expand') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="settings-group">
      <h3>{{ omega.getMessage('options_group_bypassList') }}</h3>
      <p class="help-block">{{ omega.getMessage('options_bypassListHelp') }}</p>
      <p class="help-block">
        <a href="https://developer.chrome.com/extensions/proxy#bypass_list" target="_blank">
          {{ omega.getMessage('options_bypassListHelpLinkText') }}
        </a>
      </p>
      <textarea class="monospace form-control width-limit" rows="10"
                v-model="bypassList"></textarea>
    </section>

    <ProxyAuthModal
      v-if="showAuthModal"
      :auth="profile[schemeProps[authScheme]]"
      @close="showAuthModal = false"
      @save="saveAuth($event)"
    />
  </div>
</template>
