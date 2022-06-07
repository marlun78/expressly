import cookie from "cookie";
import { statusText } from "./status-codes";
import { SurrogateKeys } from "./surrogate-keys";
import { CookieOptions, EConfig } from "..";

export default class EResponse {
  headers: Headers = new Headers();
  status: number = 0;
  body: BodyInit = null;
  hasEnded: boolean = false;
  surrogateKeys: SurrogateKeys;
  
  constructor(private config: EConfig) {
  }

  // Header helpers.
  vary(field: string) {
    this.headers.append("Vary", field);
  }

  set(headerNameOrObject: string | { [key: string]: string }, value?: string) {
    if (typeof headerNameOrObject === "string") {
      this.headers.set(headerNameOrObject, value);
    } else {
      Object.keys(headerNameOrObject).forEach((headerName) => {
        this.headers.set(headerName, headerNameOrObject[headerName]);
      });
    }
  }

  private appendHeader(headerName: string, headerValue: string | string[]) {
    if (typeof headerValue === "string") {
      this.headers.append(headerName, headerValue);
    } else if (Array.isArray(headerValue)) {
      headerValue.forEach((v) => {
        this.headers.append(headerName, v);
      });
    }
  }

  append(headerNameOrObject: string | { [key: string]: string | string[] }, value?: string | string[]) {
    if (typeof headerNameOrObject === "string") {
      this.appendHeader(headerNameOrObject, value);
    } else {
      Object.keys(headerNameOrObject).forEach((headerName) => {
        this.appendHeader(headerName, headerNameOrObject[headerName]);
      });
    }
  }

  // Cookie helpers.
  cookie(key: string, value: string, options: CookieOptions = {}): void {
    if (this.hasEnded) return;

    this.headers.append("Set-Cookie", cookie.serialize(key, value, options));
  }

  clearCookie(key: string, value: string, options: CookieOptions = {}): void {
    if (this.hasEnded) return;

    this.headers.append("Set-Cookie", cookie.serialize(key, value, { ...options, expires: "Thu, 01 Jan 1970 00:00:00 GMT" }));
  }

  // Response lifecycle methods.
  send(response: BodyInit | Response) {
    if (this.hasEnded) return;

    if (response instanceof Response) {
      this.body = response.body;
      this.headers = response.headers;
      this.status = response.status;
    } else {
      this.body = response;
    }
  }

  // End the response process [without any data], à la Express.js.
  end(body?: BodyInit) {
    if (this.hasEnded) return;
    
    this.send(body);
    this.hasEnded = true;
  }

  // Send a HTTP status code response and end the response process.
  sendStatus(status: number) {
    if (this.hasEnded) return;

    this.status = status;
    this.end(statusText[status] || null);
  }

  // Perform a redirect (default: 302 Found).
  redirect(url: string, status: 301 | 302 | 307 | 308 = 302) {
    if (this.hasEnded) return;

    this.headers.set("Location", url);
    this.sendStatus(status);
  }

  // Chainable response status setter.
  withStatus(status: number) {
    this.status = status;
    return this;
  }

  // Response body helpers.
  json(data: any) {
    if (this.hasEnded) return;

    this.headers.set("Content-Type", "application/json");
    this.send(JSON.stringify(data));
  }

  text(data: string) {
    if (this.hasEnded) return;

    this.headers.set("Content-Type", "text/plain");
    this.send(data);
  }

  html(data: string, charset?: string) {
    if (this.hasEnded) return;

    this.headers.set("Content-Type", `text/html${charset ? `; charset=${charset}` : ""}`);
    this.send(data);
  }

  // Make assumptions about status code if it isn't set.
  setDefaults() {
    if (this.status === 0) {
      if (this.body === null) {
        this.status = 404;
      } else if (!Boolean(this.body)) {
        this.status = 204;
      } else {
        this.status = 200;
      }
    }
  }
}
