class AppCacheService
{
    // The key for when the user gets redirect for a 401, but is logged in
    public static readonly Key_WasLoggedIn403 = "wasLoggedIn403";

    // Used to display a friendly message when a user is brought to the login page before redirection
    public static readonly Key_WasLoggedIn401 = "wasLoggedIn401";
    public static readonly Key_AfterLoginRedirect = "afterLoginRedirect";

    public static readonly KeyPrefix = "AppCacheService_";

    set( key: string, value: string ) { window.sessionStorage[AppCacheService.KeyPrefix + key] = value; }

    get( key: string ): string { return window.sessionStorage[AppCacheService.KeyPrefix + key]; }
    
    clear( key: string )
    {
        window.sessionStorage[AppCacheService.KeyPrefix + key] = void 0;
        delete window.sessionStorage[AppCacheService.KeyPrefix + key];
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