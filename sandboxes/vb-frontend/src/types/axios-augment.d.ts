import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When set on a request, a 403 will not trigger global redirect to access-denied */
    skip403Redirect?: boolean;
  }
}
