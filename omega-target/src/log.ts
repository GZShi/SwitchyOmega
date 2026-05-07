const Log: any = require("./log");

const replacer = (key: string, value: any): any => {
  switch (key) {
    case "username":
    case "password":
    case "host":
    case "port":
      return "<secret>";
    default:
      return value;
  }
};

exports.str = function (obj: any): string {
  if (typeof obj === "object" && obj !== null) {
    if (obj.debugStr != null) {
      if (typeof obj.debugStr === "function") {
        return obj.debugStr();
      } else {
        return obj.debugStr;
      }
    } else if (obj instanceof Error) {
      return obj.stack || obj.message;
    } else {
      return JSON.stringify(obj, replacer, 4);
    }
  } else if (typeof obj === "function") {
    if (obj.name) {
      return "<f: " + obj.name + ">";
    } else {
      return obj.toString();
    }
  } else {
    return "" + obj;
  }
};

exports.log = console.log.bind(console);

exports.error = console.error.bind(console);

exports.func = function (name: string, args: any[]): void {
  exports.log(name, "(", [].slice.call(args), ")");
};

exports.method = function (name: string, self: any, args: any[]): void {
  exports.log(exports.str(self), "<<", name, [].slice.call(args));
};

// Keep self-reference for circular require
Object.assign(Log, exports);
