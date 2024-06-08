var Ally;
(function (Ally) {
    class SiteDesignSettings {
        constructor() {
            this.fontFamily = "'Open Sans', sans-serif";
            this.bodyFontColor = "#212529";
        }
        static GetDefault() {
            const defaultSettings = {
                presetTemplateName: "default",
                fontFamily: "'Open Sans', sans-serif",
                bodyFontColor: "#212529",
                iconColor: "#007bff",
                headerBg: SiteDesignSettings.HeaderBgClassic,
                footerBg: "#404040",
                footerLinkColor: "#f7941d",
                panelsHaveBoxShadow: true,
                background: "#f3f3f3",
                buttonBgColor: "#0d6efd",
                bodyLinkColor: "#007cbc",
                navLinkColor: "white",
                navBg: "#60a2c8",
                headerBgSize: "auto 100%",
                panelsHaveRoundedCorners: true,
                listItemShadeColor: "#EBF3FE"
            };
            return defaultSettings;
        }
        static GetPreset(presetTemplateName) {
            let designSettings = null;
            switch (presetTemplateName) {
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
                            background: "#f5f5f5 " + SiteDesignSettings.SiteBgImgPinstripes,
                            buttonBgColor: "#353535",
                            bodyLinkColor: "#212529",
                            navLinkColor: "white",
                            navBg: "#000",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: false,
                            listItemShadeColor: "#F5F5F5"
                        };
                    }
                    break;
                case "peacefulPink":
                    {
                        designSettings = {
                            presetTemplateName: presetTemplateName,
                            fontFamily: "'Open Sans', sans-serif",
                            bodyFontColor: "#212529",
                            iconColor: "#EB5757",
                            headerBg: SiteDesignSettings.HeaderBgPink,
                            footerBg: "#404040",
                            footerLinkColor: "white",
                            panelsHaveBoxShadow: true,
                            background: "linear-gradient(0deg, #ffffff 0%, #f5abab 100%)",
                            buttonBgColor: "black",
                            bodyLinkColor: "#007cbc",
                            navLinkColor: "white",
                            navBg: "black",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: true,
                            listItemShadeColor: "#FDEFEF"
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
                            background: "#DBE5E9 " + SiteDesignSettings.SiteBgImgHexagons,
                            buttonBgColor: "#1e5168",
                            bodyLinkColor: "#1e5168",
                            navLinkColor: "#F3F6F7",
                            navBg: "#1e5168",
                            headerBgSize: "auto",
                            panelsHaveRoundedCorners: false,
                            listItemShadeColor: "#F2F6F7"
                        };
                    }
                    break;
            }
            return designSettings;
        }
        /**
         * Apply the site design settings from cached/server settings JSON
         */
        static ApplySiteDesignSettingsFromJson(rootScope, siteDesignSettingsJson) {
            try {
                const parsedSettings = JSON.parse(siteDesignSettingsJson);
                // Ensure the most recent setting exists on this object to be used properly
                if (parsedSettings.headerBgSize)
                    rootScope.siteDesignSettings = parsedSettings;
                // Othwerwise try to use the template name
                else if (parsedSettings.presetTemplateName && parsedSettings.presetTemplateName !== "custom")
                    rootScope.siteDesignSettings = Ally.SiteDesignSettings.GetPreset(parsedSettings.presetTemplateName);
            }
            catch {
                console.log("Failed to parse site design settings");
                rootScope.siteDesignSettings = SiteDesignSettings.GetDefault();
            }
            SiteDesignSettings.ApplySiteDesignSettingsDelayed(rootScope.siteDesignSettings);
        }
        /**
         * Apply the site design settings in a delayed, staggered manner so it gets applied as
         * fast as possible so as to avoid a flash of the old design
         */
        static ApplySiteDesignSettingsDelayed(siteDesignSettings) {
            // Apply the design four times, staggered, so as to apply the custom design settings as fast as
            // possible to avoid the user seeing the default design
            Ally.SiteDesignSettings.ApplySiteDesignSettings(siteDesignSettings);
            window.setTimeout(() => Ally.SiteDesignSettings.ApplySiteDesignSettings(siteDesignSettings), 50);
            window.setTimeout(() => Ally.SiteDesignSettings.ApplySiteDesignSettings(siteDesignSettings), 100);
            window.setTimeout(() => Ally.SiteDesignSettings.ApplySiteDesignSettings(siteDesignSettings), 250);
            window.setTimeout(() => Ally.SiteDesignSettings.ApplySiteDesignSettings(siteDesignSettings), 750);
        }
        /**
         * Update the CSS rules and site settings based on the provided settings
         */
        static ApplySiteDesignSettings(siteDesignSettings) {
            const BorderRadiusRuleValue = "12px";
            const buttonCssRule = Ally.HtmlUtil2.getCssRule(".btn-primary");
            if (buttonCssRule)
                buttonCssRule.style.backgroundColor = siteDesignSettings.buttonBgColor;
            const linkCssRules = Ally.HtmlUtil2.getAllCssRules("a");
            for (const r of linkCssRules)
                r.style.color = siteDesignSettings.bodyLinkColor;
            const textLinkCssRule = Ally.HtmlUtil2.getCssRule(".text-button, .text-link");
            if (textLinkCssRule)
                textLinkCssRule.style.color = siteDesignSettings.bodyLinkColor;
            const navLinkCssRule = Ally.HtmlUtil2.getCssRule("section.header-pill-menu-section nav a");
            if (navLinkCssRule)
                navLinkCssRule.style.color = siteDesignSettings.bodyLinkColor;
            const activeNavLinkCssRule = Ally.HtmlUtil2.getCssRule(".ally-active-nav");
            if (activeNavLinkCssRule)
                activeNavLinkCssRule.style.setProperty("color", siteDesignSettings.navLinkColor, "important");
            const inactiveNavLinkCssRule = Ally.HtmlUtil2.getCssRule(".ally-inactive-nav");
            if (inactiveNavLinkCssRule)
                inactiveNavLinkCssRule.style.setProperty("color", siteDesignSettings.navLinkColor, "important");
            const footerLinkCssRule = Ally.HtmlUtil2.getCssRule("footer a");
            if (footerLinkCssRule)
                footerLinkCssRule.style.setProperty("color", siteDesignSettings.footerLinkColor, "important");
            const navBgCssRule = Ally.HtmlUtil2.getCssRule("section.header-pill-menu-section");
            if (navBgCssRule) {
                navBgCssRule.style.background = siteDesignSettings.navBg;
                navBgCssRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
            }
            const shadowRuleValue = "0 10px 10px rgba(134, 134, 135, 0.3)";
            const boxShadowRule = Ally.HtmlUtil2.getCssRule(".box-shadow");
            if (boxShadowRule)
                boxShadowRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? shadowRuleValue : "";
            const pageRule = Ally.HtmlUtil2.getCssRule(".page");
            if (pageRule) {
                pageRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? shadowRuleValue : "";
                pageRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
            }
            const headerRule = Ally.HtmlUtil2.getCssRule("header");
            if (headerRule)
                headerRule.style.boxShadow = siteDesignSettings.panelsHaveBoxShadow ? "0 10px 10px #eaeaeb" : "inherit";
            const radioCssRule = Ally.HtmlUtil2.getCssRule('input[type="radio"]'); // Need to use double-quotes inside, not sure why
            if (radioCssRule) {
                radioCssRule.style.accentColor = siteDesignSettings.buttonBgColor;
                //radioCssRule.style.backgroundColor = siteDesignSettings.buttonBgColor;
                //radioCssRule.style.setProperty( "background-color", siteDesignSettings.buttonBgColor, "important" );
                //radioCssRule.style.borderColor = siteDesignSettings.buttonBgColor;
                radioCssRule.style.setProperty("border-color", siteDesignSettings.buttonBgColor, "important");
            }
            const checkedRadioCssRule = Ally.HtmlUtil2.getCssRule('input[type="radio"]:checked'); // Need to use double-quotes inside, not sure why
            if (checkedRadioCssRule) {
                checkedRadioCssRule.style.setProperty("background-color", siteDesignSettings.buttonBgColor, "important");
            }
            const checkboxCssRule = Ally.HtmlUtil2.getCssRule('input[type="checkbox"]');
            if (checkboxCssRule) {
                checkboxCssRule.style.accentColor = siteDesignSettings.buttonBgColor;
                checkboxCssRule.style.setProperty("background-color", siteDesignSettings.buttonBgColor, "important");
            }
            const headerBgCssRule = Ally.HtmlUtil2.getCssRule("header .logo-container");
            if (headerBgCssRule) {
                headerBgCssRule.style.background = siteDesignSettings.headerBg;
                headerBgCssRule.style.backgroundSize = siteDesignSettings.headerBgSize;
                if (siteDesignSettings.headerBg === SiteDesignSettings.HeaderBgClassic)
                    headerBgCssRule.style.borderBottom = "12px solid #83c476"; // The default header looks better with a green grass bottom border
                else
                    headerBgCssRule.style.borderBottom = "inherit";
            }
            const portletBoxCssRule = Ally.HtmlUtil2.getCssRule(".portlet-box"); // Need to use double-quotes inside, not sure why
            if (portletBoxCssRule)
                portletBoxCssRule.style.borderRadius = siteDesignSettings.panelsHaveRoundedCorners ? BorderRadiusRuleValue : "0";
            const portletIconCssRule = Ally.HtmlUtil2.getCssRule(".ally-portlet-icon");
            if (portletIconCssRule)
                portletIconCssRule.style.color = siteDesignSettings.iconColor;
            const shadedItemCssRule = Ally.HtmlUtil2.getCssRule(".ally-shaded-item");
            if (shadedItemCssRule)
                shadedItemCssRule.style.backgroundColor = siteDesignSettings.listItemShadeColor;
        }
    }
    SiteDesignSettings.SettingsCacheKey = "cachedSiteDesignSettingsJson";
    SiteDesignSettings.HeaderBgClassic = "#60a2c8 url(/assets/images/header-img-condo.jpg) no-repeat center center";
    SiteDesignSettings.HeaderBgPink = "#eb5757 url(/assets/images/ui-style-settings/pink-neighborhood.jpg) no-repeat center center";
    SiteDesignSettings.SiteBgImgHexagons = "url(/assets/images/ui-style-settings/fancy-hexes.png)";
    SiteDesignSettings.SiteBgImgPinstripes = "url(/assets/images/ui-style-settings/pinstripes-trans.png)";
    Ally.SiteDesignSettings = SiteDesignSettings;
})(Ally || (Ally = {}));
