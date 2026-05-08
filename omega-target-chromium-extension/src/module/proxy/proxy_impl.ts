const OmegaTarget = require("omega-target");
const ProxyAuth = require("./proxy_auth");
const OmegaPac = OmegaTarget.OmegaPac;

class ProxyImpl {
  log: any;
  _proxyAuth: any = null;

  constructor(log: any) {
    this.log = log;
  }

  static isSupported(): boolean {
    return false;
  }

  applyProfile(_profile: any, _meta: any): any {
    return Promise.reject();
  }

  watchProxyChange(_callback: Function): any {
    return null;
  }

  parseExternalProfile(_details: any, _options: any): any {
    return null;
  }

  _profileNotFound(name: string): any {
    this.log.error(
      "Profile " + name + " not found! Things may go very, very wrong.",
    );
    return OmegaPac.Profiles.create({
      name: name,
      profileType: "VirtualProfile",
      defaultProfileName: "direct",
    });
  }

  setProxyAuth(profile: any, options: any): any {
    return new Promise<void>((resolve) => {
      if (this._proxyAuth == null) this._proxyAuth = new ProxyAuth(this.log);
      this._proxyAuth.listen();
      const referenced_profiles: any[] = [];
      const ref_set = OmegaPac.Profiles.allReferenceSet(profile, options, {
        profileNotFound: this._profileNotFound.bind(this),
      });
      for (const name of Object.values(ref_set) as string[]) {
        const p = OmegaPac.Profiles.byName(name, options);
        if (p) referenced_profiles.push(p);
      }
      this._proxyAuth.setProxies(referenced_profiles);
      resolve();
    });
  }

  getProfilePacScript(profile: any, meta: any, options: any): string {
    if (meta == null) meta = profile;
    let ast = OmegaPac.PacGenerator.script(options, profile, {
      profileNotFound: this._profileNotFound.bind(this),
    });
    ast = OmegaPac.PacGenerator.compress(ast);
    const script = OmegaPac.PacGenerator.ascii(ast.print_to_string());
    let profileName = OmegaPac.PacGenerator.ascii(JSON.stringify(meta.name));
    profileName = profileName.replace(/\*/g, "\\u002a");
    profileName = profileName.replace(/\//g, "\\u002f");
    const prefix = "/*OmegaProfile*" + profileName + "*" + meta.revision + "*/";
    return prefix + script;
  }
}

module.exports = ProxyImpl;
