class AppCacheService
{
    // The key for when the user gets redirect for a 401, but is logged in
    Key_WasLoggedIn403 = "wasLoggedIn403";
    Key_WasLoggedIn401 = "wasLoggedIn401";
    Key_AfterLoginRedirect = "afterLoginRedirect";

    KeyPrefix = "AppCacheService_";

    set( key: string, value: string ) { window.sessionStorage[this.KeyPrefix + key] = value; }

    get( key: string ): string { return window.sessionStorage[this.KeyPrefix + key]; }
    
    clear( key: string )
    {
        window.sessionStorage[this.KeyPrefix + key] = void 0;
        delete window.sessionStorage[this.KeyPrefix + key];
    }

    getAndClear( key: string ): string
    {
        var result;
        result = this.get( key );
        this.clear( key );
        return result;
    }
}


angular.module( "CondoAlly" ).service( "appCacheService", [AppCacheService] );