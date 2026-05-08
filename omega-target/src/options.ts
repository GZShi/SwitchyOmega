const Log = require("./log");
const Storage = require("./storage");
const OmegaPac = require("omega-pac");
const jsondiffpatch = require("jsondiffpatch");

function promiseProps(obj: Record<string, any>): Promise<Record<string, any>> {
  const keys = Object.keys(obj);
  return Promise.all(keys.map((key) => Promise.resolve(obj[key]))).then(
    (values) => {
      const out: Record<string, any> = {};
      for (let i = 0; i < keys.length; i++) out[keys[i]] = values[i];
      return out;
    },
  );
}

class Options {
  _options: any = null;
  _storage: any = null;
  _state: any = null;
  _currentProfileName: string | null = null;
  _revertToProfileName: string | null = null;
  _watchingProfiles: Record<string, any> = {};
  _tempProfile: any = null;
  _tempProfileActive: boolean = false;
  _tempProfileRules: Record<string, any> = {};
  _tempProfileRulesByProfile: Record<string, any[]> = {};
  _externalProfile: any = null;
  _syncWatchStop: (() => void) | null = null;
  _watchStop: (() => void) | null = null;
  fallbackProfileName: string = "system";
  _isSystem: boolean = false;
  debugStr: string = "Options";
  ready: any = null;
  log: any;
  sync: any;
  proxyImpl: any;
  optionsLoaded: any;

  static ProfileNotExistError = class ProfileNotExistError extends Error {
    profileName: string;
    constructor(profileName: string) {
      super(`Profile ${profileName} does not exist!`);
      this.profileName = profileName;
    }
  };

  static NoOptionsError = class NoOptionsError extends Error {
    constructor() {
      super();
    }
  };

  static transformValueForSync(value: any, key: string): any {
    if (key[0] === "+") {
      if (OmegaPac.Profiles.updateUrl(value)) {
        const profile: any = {};
        for (const k of Object.keys(value)) {
          if (k === "lastUpdate" || k === "ruleList" || k === "pacScript")
            continue;
          profile[k] = value[k];
        }
        value = profile;
      }
    }
    return value;
  }

  constructor(
    options?: any,
    _storage?: any,
    _state?: any,
    log?: any,
    sync?: any,
    proxyImpl?: any,
  ) {
    this._storage = _storage;
    this._state = _state;
    this.log = log;
    this.sync = sync;
    this.proxyImpl = proxyImpl;
    this._options = {};
    this._tempProfileRules = {};
    this._tempProfileRulesByProfile = {};
    if (this._storage == null) this._storage = Storage();
    if (this._state == null) this._state = Storage();
    if (this.log == null) this.log = Log;
    if (options == null) {
      this.init();
    } else {
      this.ready = this._storage
        .remove()
        .then(() => this._storage.set(options))
        .then(() => this.init());
    }
  }

  loadOptions(opts?: { retry?: number }): any {
    const retry = opts?.retry ?? 3;
    if (this._syncWatchStop != null) this._syncWatchStop();
    this._syncWatchStop = null;
    if (this._watchStop != null) this._watchStop();
    this._watchStop = null;

    let loadRaw: any;
    if (!(this.sync != null && this.sync.enabled)) {
      if (this.sync == null) {
        this._state.set({ syncOptions: "unsupported" });
      }
      loadRaw = this._storage.get(null);
    } else {
      this._state.set({ syncOptions: "sync" });
      this._syncWatchStop = this.sync.watchAndPull(this._storage);
      loadRaw = this.sync
        .copyTo(this._storage)
        .catch((e: any) => {
          if (!(e instanceof Storage.StorageUnavailableError)) throw e;
          console.error(
            "Warning: Sync storage is not available in this browser! Disabling options sync.",
          );
          if (this._syncWatchStop != null) this._syncWatchStop();
          this._syncWatchStop = null;
          this.sync = null;
          this._state.set({ syncOptions: "unsupported" });
        })
        .then(() => this._storage.get(null));
    }

    this.optionsLoaded = loadRaw
      .then((opts: any) => this.upgrade(opts))
      .then(([opts, changes]: [any, any]) =>
        this._storage.apply({ changes: changes }).then(() => opts),
      )
      .then((opts: any) => {
        this._options = opts;
        this._watchStop = this._watch();
        this._state.get({ syncOptions: "" }).then((st: any) => {
          if (st.syncOptions) return;
          this._state.set({ syncOptions: "conflict" });
          this.sync.storage.get("schemaVersion").then((sv: any) => {
            if (!sv.schemaVersion) this._state.set({ syncOptions: "pristine" });
          });
        });
        return opts;
      })
      .catch((e: any) => {
        if (retry <= 0) return Promise.reject(e);

        const getFallbackOptions = Promise.resolve().then(() => {
          if (e instanceof Options.NoOptionsError) {
            this._state
              .get({
                firstRun: "new",
                "web.switchGuide": "showOnFirstUse",
              })
              .then((items: any) => this._state.set(items));
            if (this.sync == null) return null;
            return this._state.get({ syncOptions: "" }).then((st: any) => {
              if (st.syncOptions === "conflict") return;
              return this.sync.storage
                .get(null)
                .then((opts: any) => {
                  if (!opts["schemaVersion"]) {
                    this._state.set({ syncOptions: "pristine" });
                    return null;
                  } else {
                    this._state.set({ syncOptions: "sync" });
                    this.sync.enabled = true;
                    this.log.log("Options#loadOptions::fromSync", opts);
                    return opts;
                  }
                })
                .catch(() => null);
            });
          } else {
            this.log.error(e.stack);
            this._state.remove(["syncOptions"]);
            return null;
          }
        });

        return getFallbackOptions.then((fallbackOpts: any) => {
          if (fallbackOpts == null)
            fallbackOpts = this.parseOptions(this.getDefaultOptions());
          let prevEnabled: boolean | undefined;
          if (this.sync != null) {
            prevEnabled = this.sync.enabled;
            this.sync.enabled = false;
          }
          return this._storage
            .remove()
            .then(() => this._storage.set(fallbackOpts))
            .then(() => {
              if (this.sync != null) this.sync.enabled = prevEnabled;
              return this.loadOptions({ retry: retry - 1 });
            });
        });
      });

    return this.optionsLoaded;
  }

  init(): any {
    this.ready = this.loadOptions()
      .then(() => {
        if (this._options["-startupProfileName"]) {
          return this.applyProfile(this._options["-startupProfileName"]);
        } else {
          return this._state
            .get({
              currentProfileName: this.fallbackProfileName,
              isSystemProfile: false,
            })
            .then((st: any) => {
              if (st["isSystemProfile"]) {
                return this.applyProfile("system");
              } else {
                return this.applyProfile(
                  st["currentProfileName"] || this.fallbackProfileName,
                );
              }
            });
        }
      })
      .catch((err: any) => {
        if (!(err instanceof Options.ProfileNotExistError)) {
          this.log.error(err);
        }
        return this.applyProfile(this.fallbackProfileName);
      })
      .catch((err: any) => {
        this.log.error(err);
      })
      .then(() => this.getAll());

    this.ready.then(() => {
      if (this.sync != null && this.sync.enabled)
        this.sync.requestPush(this._options);
      this._state.get({ firstRun: "" }).then((st: any) => {
        if (st.firstRun) this.onFirstRun(st.firstRun);
      });
      if (this._options["-downloadInterval"] > 0) this.updateProfile();
    });

    return this.ready;
  }

  toString(): string {
    return "<Options>";
  }

  printProfile(_profile: any): null {
    return null;
  }

  upgrade(options: any, changes?: any): any {
    if (changes == null) changes = {};
    let version = options != null ? options["schemaVersion"] : undefined;
    if (version === 1) {
      let autoDetectUsed = false;
      OmegaPac.Profiles.each(options, (_key: string, profile: any) => {
        if (!autoDetectUsed) {
          const refs = OmegaPac.Profiles.directReferenceSet(profile);
          if (refs["+auto_detect"]) {
            autoDetectUsed = true;
          }
        }
      });
      if (autoDetectUsed) {
        options["+auto_detect"] = OmegaPac.Profiles.create({
          name: "auto_detect",
          profileType: "PacProfile",
          pacUrl: "http://wpad/wpad.dat",
          color: "#00cccc",
        });
      }
      version = options["schemaVersion"] = 2;
      changes["schemaVersion"] = 2;
    }
    if (version === 2) {
      return Promise.resolve([options, changes]);
    } else {
      return Promise.reject(new Error(`Invalid schemaVersion ${version}!`));
    }
  }

  parseOptions(options: any): any {
    if (typeof options === "string") {
      if (options[0] !== "{") {
        try {
          const Buffer = require("buffer").Buffer;
          options = new Buffer(options, "base64").toString("utf8");
        } catch (_e) {
          options = null;
        }
      }
      try {
        options = JSON.parse(options);
      } catch (_e) {
        options = null;
      }
    }
    if (!options) {
      throw new Error("Invalid options!");
    }
    return options;
  }

  reset(options?: any): any {
    this.log.method("Options#reset", this, arguments);
    if (options == null) options = this.getDefaultOptions();
    return this.upgrade(this.parseOptions(options)).then(
      ([opt]: [any, any]) => {
        if (this.sync != null) this.sync.enabled = false;
        this._state.remove(["syncOptions"]);
        return this._storage
          .remove()
          .then(() => this._storage.set(opt))
          .then(() => this.init());
      },
    );
  }

  onFirstRun(_reason: string): any {
    return null;
  }

  getDefaultOptions(): any {
    return require("./default_options")();
  }

  getAll(): any {
    return this._options;
  }

  profile(name: string): any {
    return OmegaPac.Profiles.byName(name, this._options);
  }

  patch(patch: any): any {
    if (!patch) return;
    this.log.method("Options#patch", this, arguments);

    this._options = jsondiffpatch.patch(this._options, patch);
    const changes: Record<string, any> = {};
    for (const key of Object.keys(patch)) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      const delta = patch[key];
      if (delta.length === 3 && delta[1] === 0 && delta[2] === 0) {
        changes[key] = undefined;
      } else {
        changes[key] = this._options[key];
      }
    }
    return this._setOptions(changes);
  }

  _setOptions = (changes: Record<string, any>, args?: any): any => {
    const removed: string[] = [];
    const checkRev = args?.checkRevision ?? false;
    let profilesChanged = false;
    let currentProfileAffected: string | false = false;

    for (const key of Object.keys(changes)) {
      const value = changes[key];
      if (typeof value === "undefined") {
        delete this._options[key];
        removed.push(key);
        if (key[0] === "+") {
          profilesChanged = true;
          if (key === "+" + this._currentProfileName) {
            currentProfileAffected = "removed";
          }
        }
      } else {
        if (key[0] === "+") {
          if (checkRev && this._options[key]) {
            const result = OmegaPac.Revision.compare(
              this._options[key].revision,
              value.revision,
            );
            if (result >= 0) continue;
          }
          profilesChanged = true;
        }
        this._options[key] = value;
      }
      if (!currentProfileAffected && this._watchingProfiles[key]) {
        currentProfileAffected = "changed";
      }
    }

    switch (currentProfileAffected) {
      case "removed":
        this.applyProfile(this.fallbackProfileName);
        break;
      case "changed":
        this.applyProfile(this._currentProfileName, { update: false });
        break;
      default:
        if (profilesChanged) this._setAvailableProfiles();
    }

    if (args?.persist ?? true) {
      if (this.sync != null && this.sync.enabled)
        this.sync.requestPush(changes);
      for (const key of removed) {
        delete changes[key];
      }
      return this._storage.set(changes).then(() => {
        return this._storage.remove(removed).then(() => this._options);
      });
    }
  };

  _watch(): (() => void) | null {
    const handler = (changes: any) => {
      if (changes) {
        this._setOptions(changes, { checkRevision: true, persist: false });
      } else {
        changes = this._options;
      }

      const refresh = changes["-refreshOnProfileChange"];
      if (refresh != null) {
        this._state.set({ refreshOnProfileChange: refresh });
      }

      if (
        Object.prototype.hasOwnProperty.call(changes, "-showExternalProfile")
      ) {
        let showExternal = changes["-showExternalProfile"];
        if (showExternal == null) {
          showExternal = true;
          this._setOptions({ "-showExternalProfile": true }, { persist: true });
        }
        this._state.set({ showExternalProfile: showExternal });
      }

      let quickSwitchProfiles = changes["-quickSwitchProfiles"];
      quickSwitchProfiles =
        this._cleanUpQuickSwitchProfiles(quickSwitchProfiles);
      if (
        changes["-enableQuickSwitch"] != null ||
        quickSwitchProfiles != null
      ) {
        this.reloadQuickSwitch();
      }
      if (changes["-downloadInterval"] != null) {
        this.schedule(
          "updateProfile",
          this._options["-downloadInterval"],
          () => {
            this.updateProfile();
          },
        );
      }
      if (changes["-showInspectMenu"] != null || changes === this._options) {
        let showMenu = this._options["-showInspectMenu"];
        if (showMenu == null) {
          showMenu = true;
          this._setOptions({ "-showInspectMenu": true }, { persist: true });
        }
        this.setInspect({ showMenu: showMenu });
      }
      if (changes["-monitorWebRequests"] != null || changes === this._options) {
        let monitor = this._options["-monitorWebRequests"];
        if (monitor == null) {
          monitor = true;
          this._setOptions({ "-monitorWebRequests": true }, { persist: true });
        }
        this.setMonitorWebRequests(monitor);
      }
    };

    handler(null);
    return this._storage.watch(null, handler);
  }

  _cleanUpQuickSwitchProfiles(quickSwitchProfiles: any): string[] | undefined {
    if (quickSwitchProfiles == null) return undefined;
    const seen: Record<string, boolean> = {};
    const valid = quickSwitchProfiles.filter((name: string) => {
      if (!name) return false;
      const key = OmegaPac.Profiles.nameAsKey(name);
      if (seen[key]) return false;
      if (!OmegaPac.Profiles.byName(name, this._options)) return false;
      seen[key] = true;
      return true;
    });
    if (valid.length !== quickSwitchProfiles.length) {
      this._setOptions({ "-quickSwitchProfiles": valid }, { persist: true });
    }
    return valid;
  }

  reloadQuickSwitch(): any {
    let profiles = this._options["-quickSwitchProfiles"];
    if (profiles.length < 2) profiles = null;
    if (this._options["-enableQuickSwitch"]) {
      return this.setQuickSwitch(profiles, !!profiles);
    } else {
      return this.setQuickSwitch(null, !!profiles);
    }
  }

  setInspect(_settings?: any): any {
    return Promise.resolve();
  }

  setMonitorWebRequests(_enabled?: boolean): any {
    return Promise.resolve();
  }

  watch(callback: Function): any {
    return this._storage.watch(null, callback);
  }

  _profileNotFound(name: string): any {
    this.log.error(
      `Profile ${name} not found! Things may go very, very wrong.`,
    );
    return OmegaPac.Profiles.create({
      name: name,
      profileType: "VirtualProfile",
      defaultProfileName: "direct",
    });
  }

  pacForProfile(profile: any, compress: boolean = false): any {
    let ast = OmegaPac.PacGenerator.script(this._options, profile, {
      profileNotFound: this._profileNotFound.bind(this),
    });
    if (compress) {
      ast = OmegaPac.PacGenerator.compress(ast);
    }
    return Promise.resolve(OmegaPac.PacGenerator.ascii(ast.print_to_string()));
  }

  _setAvailableProfiles(): void {
    const profile = this._currentProfileName ? this.currentProfile() : null;
    const profiles: Record<string, any> = {};
    const currentIncludable =
      profile && OmegaPac.Profiles.isIncludable(profile);
    let allReferenceSet: Record<string, any> | null = null;
    let results: any[] | null = null;
    if (!profile || !OmegaPac.Profiles.isInclusive(profile)) {
      results = [];
    }

    OmegaPac.Profiles.each(this._options, (key: string, p: any) => {
      profiles[key] = {
        name: p.name,
        profileType: p.profileType,
        color: p.color,
        desc: this.printProfile(p),
        builtin: p.builtin ? true : undefined,
      };
      if (p.profileType === "VirtualProfile") {
        profiles[key].defaultProfileName = p.defaultProfileName;
        if (allReferenceSet == null) {
          allReferenceSet = profile
            ? OmegaPac.Profiles.allReferenceSet(profile, this._options, {
                profileNotFound: this._profileNotFound.bind(this),
              })
            : {};
        }
        if (allReferenceSet[key]) {
          profiles[key].validResultProfiles =
            OmegaPac.Profiles.validResultProfilesFor(p, this._options).map(
              (result: any) => result.name,
            );
        }
      }
      if (currentIncludable && OmegaPac.Profiles.isIncludable(p)) {
        results?.push(p.name);
      }
    });

    if (profile && OmegaPac.Profiles.isInclusive(profile)) {
      results = OmegaPac.Profiles.validResultProfilesFor(
        profile,
        this._options,
      );
      results = results.map((p: any) => p.name);
    }

    this._state.set({
      availableProfiles: profiles,
      validResultProfiles: results,
    });
  }

  applyProfile(name: string, options?: any): any {
    this.log.method("Options#applyProfile", this, arguments);
    const profile = OmegaPac.Profiles.byName(name, this._options);
    if (!profile) {
      return Promise.reject(new Options.ProfileNotExistError(name));
    }

    this._currentProfileName = profile.name;
    this._isSystem = options?.system || profile.profileType === "SystemProfile";
    this._watchingProfiles = OmegaPac.Profiles.allReferenceSet(
      profile,
      this._options,
      { profileNotFound: this._profileNotFound.bind(this) },
    );

    this._state.set({
      currentProfileName: this._currentProfileName,
      isSystemProfile: this._isSystem,
      currentProfileCanAddRule:
        profile.rules != null && profile.profileType !== "VirtualProfile",
    });
    this._setAvailableProfiles();

    this.currentProfileChanged(options?.reason);
    if (options != null && options.proxy === false) {
      return Promise.resolve();
    }

    this._tempProfileActive = false;
    let applyProxy: any;
    if (this._tempProfile != null && OmegaPac.Profiles.isIncludable(profile)) {
      this._tempProfileActive = true;
      if (this._tempProfile.defaultProfileName !== profile.name) {
        this._tempProfile.defaultProfileName = profile.name;
        this._tempProfile.color = profile.color;
        OmegaPac.Profiles.updateRevision(this._tempProfile);
      }

      const removedKeys: string[] = [];
      for (const key of Object.keys(this._tempProfileRulesByProfile)) {
        if (!OmegaPac.Profiles.byKey(key, this._options)) {
          removedKeys.push(key);
          for (const rule of this._tempProfileRulesByProfile[key]) {
            rule.profileName = null;
            this._tempProfile.rules.splice(
              this._tempProfile.rules.indexOf(rule),
              1,
            );
          }
        }
      }
      if (removedKeys.length > 0) {
        for (const key of removedKeys) {
          delete this._tempProfileRulesByProfile[key];
        }
        OmegaPac.Profiles.updateRevision(this._tempProfile);
      }

      this._watchingProfiles = OmegaPac.Profiles.allReferenceSet(
        this._tempProfile,
        this._options,
        { profileNotFound: this._profileNotFound.bind(this) },
      );

      applyProxy = this.proxyImpl.applyProfile(
        this._tempProfile,
        profile,
        this._options,
      );
    } else {
      applyProxy = this.proxyImpl.applyProfile(profile, profile, this._options);
    }

    if (options != null && options.update === false) return applyProxy;

    applyProxy.then(() => {
      if (this._options["-downloadInterval"] <= 0) return;
      if (this._currentProfileName !== profile.name) return;
      const updateProfiles: string[] = [];
      for (const name of Object.values(this._watchingProfiles) as string[]) {
        updateProfiles.push(name);
      }
      if (updateProfiles.length > 0) {
        this.updateProfile(updateProfiles);
      }
    });
    return applyProxy;
  }

  currentProfile(): any {
    if (this._currentProfileName) {
      return OmegaPac.Profiles.byName(this._currentProfileName, this._options);
    } else {
      return this._externalProfile;
    }
  }

  isSystem(): boolean {
    return this._isSystem;
  }

  currentProfileChanged(_reason?: string): any {
    return null;
  }

  setQuickSwitch(_quickSwitch: any, _canEnable: boolean): any {
    return Promise.resolve();
  }

  schedule(_name: string, _period: number, _callback: Function): any {
    return Promise.resolve();
  }

  isCurrentProfileStatic(): boolean {
    if (!this._currentProfileName) return true;
    if (this._tempProfileActive) return false;
    const current = this.currentProfile();
    if (OmegaPac.Profiles.isInclusive(current)) return false;
    return true;
  }

  updateProfile(
    name?: string | string[] | null,
    opt_bypass_cache?: boolean,
  ): any {
    this.log.method("Options#updateProfile", this, arguments);
    const results: Record<string, any> = {};
    OmegaPac.Profiles.each(this._options, (key: string, profile: any) => {
      if (name != null) {
        if (Array.isArray(name)) {
          if (name.indexOf(profile.name) < 0) return;
        } else {
          if (profile.name !== name) return;
        }
      }
      const url = OmegaPac.Profiles.updateUrl(profile);
      if (url) {
        const type_hints = OmegaPac.Profiles.updateContentTypeHints(profile);
        const fetchResult = this.fetchUrl(url, opt_bypass_cache, type_hints);
        results[key] = fetchResult
          .then((data: any) => {
            if (!data) return profile;
            const p = OmegaPac.Profiles.byKey(key, this._options);
            p.lastUpdate = new Date().toISOString();
            if (OmegaPac.Profiles.update(p, data)) {
              OmegaPac.Profiles.dropCache(p);
              const ch: Record<string, any> = {};
              ch[key] = p;
              return Promise.resolve(this._setOptions(ch)).then(() => p);
            } else {
              return profile;
            }
          })
          .catch((reason: any) => {
            return reason instanceof Error ? reason : new Error(reason);
          });
      }
    });
    return promiseProps(results);
  }

  fetchUrl(_url: string, _bypass?: boolean, _hints?: string[]): any {
    return Promise.reject(new Error("not implemented"));
  }

  _replaceRefChanges(
    fromName: string,
    toName: string,
    changes?: Record<string, any>,
  ): Record<string, any> {
    if (changes == null) changes = {};

    OmegaPac.Profiles.each(this._options, (_key: string, p: any) => {
      if (p.name === fromName || p.name === toName) return;
      if (OmegaPac.Profiles.replaceRef(p, fromName, toName)) {
        OmegaPac.Profiles.updateRevision(p);
        changes![OmegaPac.Profiles.nameAsKey(p)] = p;
      }
    });

    if (this._options["-startupProfileName"] === fromName) {
      changes["-startupProfileName"] = toName;
    }
    const quickSwitch = this._options["-quickSwitchProfiles"];
    if (quickSwitch.indexOf(toName) < 0) {
      for (let i = 0; i < quickSwitch.length; i++) {
        if (quickSwitch[i] === fromName) {
          quickSwitch[i] = toName;
          changes["-quickSwitchProfiles"] = quickSwitch;
        }
      }
    }

    return changes;
  }

  replaceRef(fromName: string, toName: string): any {
    this.log.method("Options#replaceRef", this, arguments);
    const profile = OmegaPac.Profiles.byName(fromName, this._options);
    if (!profile) {
      return Promise.reject(new Options.ProfileNotExistError(fromName));
    }

    const changes = this._replaceRefChanges(fromName, toName);
    for (const key of Object.keys(changes)) {
      this._options[key] = changes[key];
    }

    const fromKey = OmegaPac.Profiles.nameAsKey(fromName);
    if (this._watchingProfiles[fromKey]) {
      if (this._currentProfileName === fromName) {
        this._currentProfileName = toName;
      }
      this.applyProfile(this._currentProfileName!);
    }

    return this._setOptions(changes);
  }

  renameProfile(fromName: string, toName: string): any {
    this.log.method("Options#renameProfile", this, arguments);
    if (OmegaPac.Profiles.byName(toName, this._options)) {
      return Promise.reject(new Error(`Target name ${toName} already taken!`));
    }
    const profile = OmegaPac.Profiles.byName(fromName, this._options);
    if (!profile) {
      return Promise.reject(new Options.ProfileNotExistError(fromName));
    }

    profile.name = toName;
    const changes: Record<string, any> = {};
    changes[OmegaPac.Profiles.nameAsKey(profile)] = profile;

    this._replaceRefChanges(fromName, toName, changes);
    for (const key of Object.keys(changes)) {
      this._options[key] = changes[key];
    }

    const fromKey = OmegaPac.Profiles.nameAsKey(fromName);
    changes[fromKey] = undefined;
    delete this._options[fromKey];

    if (this._watchingProfiles[fromKey]) {
      if (this._currentProfileName === fromName) {
        this._currentProfileName = toName;
      }
      this.applyProfile(this._currentProfileName!);
    }

    return this._setOptions(changes);
  }

  addTempRule(domain: string, profileName: string): any {
    this.log.method("Options#addTempRule", this, arguments);
    if (!this._currentProfileName) return Promise.resolve();
    const profile = OmegaPac.Profiles.byName(profileName, this._options);
    if (!profile) {
      return Promise.reject(new Options.ProfileNotExistError(profileName));
    }
    if (this._tempProfile == null) {
      this._tempProfile = OmegaPac.Profiles.create("", "SwitchProfile");
      const current = this.currentProfile();
      this._tempProfile.color = current.color;
      this._tempProfile.defaultProfileName = current.name;
    }

    let changed = false;
    let rule = this._tempProfileRules[domain];
    if (rule && rule.profileName) {
      if (rule.profileName !== profileName) {
        const key = OmegaPac.Profiles.nameAsKey(rule.profileName);
        const list = this._tempProfileRulesByProfile[key];
        list.splice(list.indexOf(rule), 1);
        rule.profileName = profileName;
        changed = true;
      }
    } else {
      rule = {
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*." + domain,
        },
        profileName: profileName,
        isTempRule: true,
      };
      this._tempProfile.rules.push(rule);
      this._tempProfileRules[domain] = rule;
      changed = true;
    }

    const key = OmegaPac.Profiles.nameAsKey(profileName);
    let rulesByProfile = this._tempProfileRulesByProfile[key];
    if (rulesByProfile == null) {
      rulesByProfile = this._tempProfileRulesByProfile[key] = [];
    }
    rulesByProfile.push(rule);

    if (changed) {
      OmegaPac.Profiles.updateRevision(this._tempProfile);
      return this.applyProfile(this._currentProfileName);
    } else {
      return Promise.resolve();
    }
  }

  queryTempRule(domain: string): string | null {
    const rule = this._tempProfileRules[domain];
    if (rule) {
      if (rule.profileName) {
        return rule.profileName;
      } else {
        delete this._tempProfileRules[domain];
      }
    }
    return null;
  }

  addCondition(condition: any, profileName: string): any {
    this.log.method("Options#addCondition", this, arguments);
    if (!this._currentProfileName) return Promise.resolve();
    const profile = OmegaPac.Profiles.byName(
      this._currentProfileName,
      this._options,
    );
    if (!(profile != null && profile.rules != null)) {
      return Promise.reject(
        new Error(
          `Cannot add condition to Profile ${profile?.name} (${profile?.type})`,
        ),
      );
    }
    const target = OmegaPac.Profiles.byName(profileName, this._options);
    if (target == null) {
      return Promise.reject(new Options.ProfileNotExistError(profileName));
    }
    if (!Array.isArray(condition)) {
      condition = [condition];
    }

    for (const cond of condition) {
      const tag = OmegaPac.Conditions.tag(cond);
      for (let i = 0; i < profile.rules.length; i++) {
        if (OmegaPac.Conditions.tag(profile.rules[i].condition) === tag) {
          profile.rules.splice(i, 1);
          break;
        }
      }

      if (this._options["-addConditionsToBottom"]) {
        profile.rules.push({
          condition: cond,
          profileName: profileName,
        });
      } else {
        profile.rules.unshift({
          condition: cond,
          profileName: profileName,
        });
      }
    }

    OmegaPac.Profiles.updateRevision(profile);
    const changes: Record<string, any> = {};
    changes[OmegaPac.Profiles.nameAsKey(profile)] = profile;
    return this._setOptions(changes);
  }

  setDefaultProfile(profileName: string, defaultProfileName: string): any {
    this.log.method("Options#setDefaultProfile", this, arguments);
    const profile = OmegaPac.Profiles.byName(profileName, this._options);
    if (profile == null) {
      return Promise.reject(new Options.ProfileNotExistError(profileName));
    } else if (profile.defaultProfileName == null) {
      return Promise.reject(
        new Error(
          `Profile ${profile.name} (${profile.type}) does not have defaultProfileName!`,
        ),
      );
    }
    const target = OmegaPac.Profiles.byName(defaultProfileName, this._options);
    if (target == null) {
      return Promise.reject(
        new Options.ProfileNotExistError(defaultProfileName),
      );
    }

    profile.defaultProfileName = defaultProfileName;
    OmegaPac.Profiles.updateRevision(profile);
    const changes: Record<string, any> = {};
    changes[OmegaPac.Profiles.nameAsKey(profile)] = profile;
    return this._setOptions(changes);
  }

  addProfile(profile: any): any {
    this.log.method("Options#addProfile", this, arguments);
    if (OmegaPac.Profiles.byName(profile.name, this._options)) {
      return Promise.reject(
        new Error(`Target name ${profile.name} already taken!`),
      );
    } else {
      const changes: Record<string, any> = {};
      changes[OmegaPac.Profiles.nameAsKey(profile)] = profile;
      return this._setOptions(changes);
    }
  }

  matchProfile(request: any): any {
    if (!this._currentProfileName) {
      return Promise.resolve({ profile: this._externalProfile, results: [] });
    }
    const results: any[] = [];
    let profile = this._tempProfileActive
      ? this._tempProfile
      : OmegaPac.Profiles.byName(this._currentProfileName, this._options);
    let lastProfile = profile;
    while (profile) {
      lastProfile = profile;
      const result = OmegaPac.Profiles.match(profile, request);
      if (result == null) break;
      results.push(result);
      let next: any;
      if (Array.isArray(result)) {
        next = result[0];
      } else if (result.profileName) {
        next = OmegaPac.Profiles.nameAsKey(result.profileName);
      } else {
        break;
      }
      profile = OmegaPac.Profiles.byKey(next, this._options);
    }
    return Promise.resolve({ profile: lastProfile, results: results });
  }

  setExternalProfile(profile: any, args?: any): any {
    if (this._options["-revertProxyChanges"] && !this._isSystem) {
      if (
        profile.name !== this._currentProfileName &&
        this._currentProfileName
      ) {
        if (!(args != null && args.noRevert)) {
          this.applyProfile(this._revertToProfileName);
          this._revertToProfileName = null;
          return;
        } else {
          if (this._revertToProfileName == null)
            this._revertToProfileName = this._currentProfileName;
        }
      }
    }
    const p = OmegaPac.Profiles.byName(profile.name, this._options);
    if (p) {
      if (args?.internal) {
        return this.applyProfile(p.name, { proxy: false });
      } else {
        return this.applyProfile(p.name, {
          proxy: false,
          system: this._isSystem,
          reason: "external",
        });
      }
    } else {
      this._currentProfileName = null;
      this._externalProfile = profile;
      if (profile.color == null) profile.color = "#49afcd";
      this._state.set({
        currentProfileName: "",
        externalProfile: profile,
        validResultProfiles: [],
        currentProfileCanAddRule: false,
      });
      this.currentProfileChanged("external");
      return;
    }
  }

  setOptionsSync(enabled: boolean, args?: any): any {
    this.log.method("Options#setOptionsSync", this, arguments);
    if (this.sync == null) {
      return Promise.reject(new Error("Options syncing is unsupported."));
    }
    return this._state.get({ syncOptions: "" }).then((st: any) => {
      if (!enabled) {
        if (st.syncOptions === "sync") {
          this._state.set({ syncOptions: "conflict" });
        }
        this.sync.enabled = false;
        if (this._syncWatchStop != null) this._syncWatchStop();
        this._syncWatchStop = null;
        return;
      }

      if (st.syncOptions === "conflict") {
        if (!(args != null && args.force)) {
          return Promise.reject(
            new Error(
              "Syncing not enabled due to conflict. Retry with force to overwrite local options and enable syncing.",
            ),
          );
        }
      }
      if (st.syncOptions === "sync") return;
      return this._state.set({ syncOptions: "sync" }).then(() => {
        if (st.syncOptions === "conflict") {
          this.sync.enabled = false;
          return this._storage.remove().then(() => {
            this.sync.enabled = true;
            return this.init();
          });
        } else {
          this.sync.enabled = true;
          if (this._syncWatchStop != null) this._syncWatchStop();
          this.sync.requestPush(this._options);
          this._syncWatchStop = this.sync.watchAndPull(this._storage);
          return;
        }
      });
    });
  }

  resetOptionsSync(): any {
    this.log.method("Options#resetOptionsSync", this, arguments);
    if (this.sync == null) {
      return Promise.reject(new Error("Options syncing is unsupported."));
    }
    this.sync.enabled = false;
    if (this._syncWatchStop != null) this._syncWatchStop();
    this._syncWatchStop = null;
    this._state.set({ syncOptions: "conflict" });

    return this.sync.storage.remove().then(() => {
      this._state.set({ syncOptions: "pristine" });
    });
  }
}

module.exports = Options;
