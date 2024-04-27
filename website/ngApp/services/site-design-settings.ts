namespace Ally
{
    export class SiteDesignSettings
    {
        static readonly SettingsCacheKey = "cachedSiteDesignSettingsJson";


        presetTemplateName: "default" | "modern" | "peacefulPink" | "gatedCommunity" | "custom";
        fontFamily: string = "'Open Sans', sans-serif";
        bodyFontColor: string = "#212529";
        iconColor: string;
        headerBg: string;
        footerBg: string; // Just match text color? button color?
        footerLinkColor: string;
        panelsHaveBoxShadow: boolean;
        panelBorderRadius: string;
        background: string;
        buttonBgColor: string;
        bodyLinkColor: string;
        navLinkColor: string;
        navBg: string;
        headerBgSize: string;
        panelsHaveRoundedCorners: boolean;


        static GetDefault(): SiteDesignSettings
        {
            const defaultSettings: SiteDesignSettings =
            {
                presetTemplateName: "default",
                fontFamily: "'Open Sans', sans-serif",
                bodyFontColor: "#212529",
                iconColor: "#007bff",
                headerBg: "#60a2c8 url(/assets/images/header-img-condo.jpg) no-repeat center center",
                footerBg: "#404040",
                footerLinkColor: "#f7941d",
                panelsHaveBoxShadow: true,
                panelBorderRadius: "0",
                background: "#f3f3f3",
                buttonBgColor: "#0d6efd",
                bodyLinkColor: "#007cbc",
                navLinkColor: "white",
                navBg: "#60a2c8",
                headerBgSize: "auto 100%",
                panelsHaveRoundedCorners: true
            };

            return defaultSettings;
        }


        static GetPreset( presetTemplateName: string )
        {
            let designSettings: SiteDesignSettings = null;

            switch( presetTemplateName )
            {
                case "default":
                    return SiteDesignSettings.GetDefault();

                case "modern":
                    {
                        designSettings = {
                            presetTemplateName: presetTemplateName,
                            fontFamily: "'Open Sans', sans-serif",
                            bodyFontColor: "#212529",
                            iconColor: "#353535",
                            headerBg: "#353535",
                            footerBg: "#353535",
                            footerLinkColor: "white",
                            panelsHaveBoxShadow: false,
                            panelBorderRadius: "0",
                            background: "url(/assets/images/ui-style-settings/pinstripes.png)",
                            buttonBgColor: "#353535",
                            bodyLinkColor: "#212529",
                            navLinkColor: "white",
                            navBg: "#000",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: false
                        };
                    }
                    break;

                case "peacefulPink":
                    {
                        designSettings = {
                            presetTemplateName: presetTemplateName,
                            fontFamily: "'Open Sans', sans-serif",
                            bodyFontColor: "#212529",
                            iconColor: "#007bff",
                            headerBg: "#eb5757 url(/assets/images/ui-style-settings/pink-neighborhood.jpg) no-repeat center center",
                            footerBg: "#404040",
                            footerLinkColor: "white",
                            panelsHaveBoxShadow: true,
                            panelBorderRadius: "0",
                            background: "linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(245,171,171,1) 100%)",
                            buttonBgColor: "black",
                            bodyLinkColor: "#007cbc",
                            navLinkColor: "white",
                            navBg: "black",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: true
                        };
                    }
                    break;

                case "gatedCommunity":
                    {
                        designSettings = {
                            presetTemplateName: presetTemplateName,
                            fontFamily: "serif",
                            bodyFontColor: "#1e5168",
                            iconColor: "#1e5168",
                            headerBg: "#1e5168",
                            footerBg: "#1e5168",
                            footerLinkColor: "white",
                            panelsHaveBoxShadow: true,
                            panelBorderRadius: "0",
                            background: "#DBE5E9 url(/assets/images/ui-style-settings/fancy-hexes.png)",
                            buttonBgColor: "#1e5168",
                            bodyLinkColor: "#1e5168",
                            navLinkColor: "#F3F6F7",
                            navBg: "#1e5168",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: false
                        };
                    }
                    break;
            }

            return designSettings;
        }


        /**
         * Apply the site design settings from cached/server settings JSON
         */
        static ApplySiteDesignSettingsFromJson( rootScope: ng.IRootScopeService, siteDesignSettingsJson: string )
        {
            try
            {
                const parsedSettings = JSON.parse( siteDesignSettingsJson ) as Ally.SiteDesignSettings;

                // Ensure the most recent setting exists on this object to be used properly
                if( parsedSettings.headerBgSize )
                    rootScope.siteDesignSettings = parsedSettings;
                // Othwerwise try to use the template name
                else if( parsedSettings.presetTemplateName && parsedSettings.presetTemplateName !== "custom" )
                    rootScope.siteDesignSettings = Ally.SiteDesignSettings.GetPreset( parsedSettings.presetTemplateName );
            }
            catch
            {
                console.log( "Failed to parse site design settings" );
                rootScope.siteDesignSettings = SiteDesignSettings.GetDefault();
            }

            SiteDesignSettings.ApplySiteDesignSettingsDelayed( rootScope.siteDesignSettings );
        }


        /**
         * Apply the site design settings in a delayed, staggered manner so it gets applied as
         * fast as possible so as to avoid a flash of the old design
         */
        static ApplySiteDesignSettingsDelayed( siteDesignSettings: SiteDesignSettings )
        {
            // Apply the design four times, staggered, so as to apply the custom design settings as fast as
            // possible to avoid the user seeing the default design
            Ally.SiteDesignSettings.ApplySiteDesignSettings( siteDesignSettings );
            window.setTimeout( () => Ally.SiteDesignSettings.ApplySiteDesignSettings( siteDesignSettings ), 50 );
            window.setTimeout( () => Ally.SiteDesignSettings.ApplySiteDesignSettings( siteDesignSettings ), 100 );
            window.setTimeout( () => Ally.SiteDesignSettings.ApplySiteDesignSettings( siteDesignSettings ), 250 );
            window.setTimeout( () => Ally.SiteDesignSettings.ApplySiteDesignSettings( siteDesignSettings ), 750 );
        }


        /**
         * Update the CSS rules and site settings based on the provided settings
         */
        static ApplySiteDesignSettings( siteDesignSettings: SiteDesignSettings )
        {
            const BorderRadiusRuleValue = "12px";

            const buttonCssRule = HtmlUtil2.getCssRule( ".btn-primary" );
            if( buttonCssRule )
                buttonCssRule.style.backgroundColor = siteDesignSettings.buttonBgColor;

            const linkCssRules = HtmlUtil2.getAllCssRules( "a" );
            for( const r of linkCssRules )
                r.style.color = siteDesignSettings.bodyLinkColor;

            const textLinkCssRule = HtmlUtil2.getCssRule( ".text-button, .text-link" );
            if( textLinkCssRule )
                textLinkCssRule.style.color = siteDesignSettings.bodyLinkColor;

            const navLinkCssRule = HtmlUtil2.getCssRule( "section.header-pill-menu-section nav a" );
            if( navLinkCssRule )
                navLinkCssRule.style.color = siteDesignSettings.bodyLinkColor;

            const activeNavLinkCssRule = HtmlUtil2.getCssRule( ".ally-active-nav" );
            if( activeNavLinkCssRule )
                activeNavLinkCssRule.style.setProperty( "color", siteDesignSettings.navLinkColor, "important" );

            const inactiveNavLinkCssRule = HtmlUtil2.getCssRule( ".ally-inactive-nav" );
            if( inactiveNavLinkCssRule )
                inactiveNavLinkCssRule.style.setProperty( "color", siteDesignSettings.navLinkColor, "important" );

            const footerLinkCssRule = HtmlUtil2.getCssRule( "footer a" );
            if( footerLinkCssRule )
                footerLinkCssRule.style.setProperty( "color", siteDesignSettings.footerLinkColor, "important" );

            const navBgCssRule = HtmlUtil2.getCssRule( "section.header-pill-menu-section" );
            if( navBgCssRule )
            {
                navBgCssRule.style.background = siteDesignSettings.navBg;
                navBgCssRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
            }

            const shadowRuleValue = "0 10px 10px rgba(134, 134, 135, 0.3)";
            const boxShadowRule = HtmlUtil2.getCssRule( ".box-shadow" );
            if( boxShadowRule )
                boxShadowRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? shadowRuleValue : "";

            const pageRule = HtmlUtil2.getCssRule( ".page" );
            if( pageRule )
            {
                pageRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? shadowRuleValue : "";
                pageRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
            }

            const headerRule = HtmlUtil2.getCssRule( "header" );
            if( headerRule )
                headerRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? "0 10px 10px #eaeaeb" : "inherit";

            const radioCssRule = HtmlUtil2.getCssRule( 'input[type="radio"]' ); // Need to use double-quotes inside, not sure why
            if( radioCssRule )
                radioCssRule.style.accentColor = siteDesignSettings.buttonBgColor;

            const checkboxCssRule = HtmlUtil2.getCssRule( 'input[type="checkbox"]' );
            if( checkboxCssRule )
            {
                checkboxCssRule.style.accentColor = siteDesignSettings.buttonBgColor;
                checkboxCssRule.style.setProperty( "background-color", siteDesignSettings.buttonBgColor, "important" );
            }

            const headerBgCssRule = HtmlUtil2.getCssRule( "header .logo-container" );
            if( headerBgCssRule )
            {
                headerBgCssRule.style.background = siteDesignSettings.headerBg;
                headerBgCssRule.style.backgroundSize = siteDesignSettings.headerBgSize;

                if( siteDesignSettings.headerBg === "#60a2c8 url(/assets/images/header-img-condo.jpg) no-repeat center center" )
                    headerBgCssRule.style.borderBottom = "12px solid #83c476"; // The default header looks better with a green grass bottom border
                else
                    headerBgCssRule.style.borderBottom = "inherit";
            }

            const portletBoxCssRule = HtmlUtil2.getCssRule( ".portlet-box" ); // Need to use double-quotes inside, not sure why
            if( portletBoxCssRule )
                portletBoxCssRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
        }
    }
}
