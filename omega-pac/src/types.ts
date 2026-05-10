// Shared type definitions for the omega-pac module.

/** A request parsed by requestFromUrl. */
export interface ParsedRequest {
  url: string;
  host: string;
  scheme: string;
}

// ---------------------------------------------------------------------------
// Condition types
// ---------------------------------------------------------------------------

export interface BaseCondition {
  conditionType: string;
  pattern?: string;
}

export interface ConditionHandler {
  abbrs: string[];
  analyze: (condition: any) => any;
  match: (condition: any, request: ParsedRequest, cache: any) => any;
  compile: (condition: any, cache: any) => any;
  str?: (condition: any) => string;
  fromStr?: (input: string, condition: any) => any;
}

// ---------------------------------------------------------------------------
// Profile types
// ---------------------------------------------------------------------------

export interface ProfileHandler {
  includable?: boolean | ((profile: any) => boolean);
  inclusive?: boolean;
  create?: (profile: any) => void;
  analyze?: (profile: any) => any;
  match?: (profile: any, request: ParsedRequest, cache: any) => any;
  compile?: (profile: any, cache: any) => any;
  replaceRef?: (profile: any, fromName: string, toName: string) => boolean;
  directReferenceSet?: (profile: any) => Record<string, string>;
  updateUrl?: (profile: any) => string | undefined;
  updateContentTypeHints?: () => string[];
  update?: (profile: any, data: string) => boolean;
}
