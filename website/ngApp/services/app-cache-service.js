class AppCacheService {
    set(key, value) { window.sessionStorage[AppCacheService.KeyPrefix + key] = value; }
    get(key) { return window.sessionStorage[AppCacheService.KeyPrefix + key]; }
    clear(key) {
        window.sessionStorage[AppCacheService.KeyPrefix + key] = void 0;
        delete window.sessionStorage[AppCacheService.KeyPrefix + key];
    }
    getAndClear(key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    }
}
// The key for when the user gets redirect for a 401, but is logged in
AppCacheService.Key_WasLoggedIn403 = "wasLoggedIn403";
// Used to display a friendly message when a user is brought to the login page before redirection
AppCacheService.Key_WasLoggedIn401 = "wasLoggedIn401";
AppCacheService.Key_AfterLoginRedirect = "afterLoginRedirect";
AppCacheService.KeyPrefix = "AppCacheService_";
angular.module("CondoAlly").service("appCacheService", [AppCacheService]);
