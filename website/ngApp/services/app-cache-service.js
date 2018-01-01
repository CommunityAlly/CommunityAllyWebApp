var AppCacheService = /** @class */ (function () {
    function AppCacheService() {
        // The key for when the user gets redirect for a 401, but is logged in
        this.Key_WasLoggedIn403 = "wasLoggedIn403";
        this.Key_WasLoggedIn401 = "wasLoggedIn401";
        this.Key_AfterLoginRedirect = "afterLoginRedirect";
        this.KeyPrefix = "AppCacheService_";
    }
    AppCacheService.prototype.set = function (key, value) { window.sessionStorage[this.KeyPrefix + key] = value; };
    AppCacheService.prototype.get = function (key) { return window.sessionStorage[this.KeyPrefix + key]; };
    AppCacheService.prototype.clear = function (key) {
        window.sessionStorage[this.KeyPrefix + key] = void 0;
        delete window.sessionStorage[this.KeyPrefix + key];
    };
    AppCacheService.prototype.getAndClear = function (key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    };
    return AppCacheService;
}());
angular.module("CondoAlly").service("appCacheService", [AppCacheService]);
