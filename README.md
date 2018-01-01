# Community Ally
**Online tools for offline groups to accomplish greater things.** Manage documents, payments, to-dos, calendars, committees, private communication, events, history, polls, maintenance, membership and more in a tool uniquely tailored for condos, HOAs, and neighborhoods. It's the perfect tool for these groups because it's built by board members that use it every day.

[![N|Logo](https://communityally.org/images/community-ally-800.png)](https://communityally.org/)

This is the code base for the front-end of the Community Ally web-based community management tool. [Condo Ally](https://condoally.com/), [HOA Ally](https://hoaally.org/), and Neighborhood Ally use this code base. The back-end server code base is not yet open source.

# Using Community Ally

If you're ready to improve your, or your client's, condo association, HOA, or neighborhood, go sign-up immediately at one of the afforementioned sites. It's free, instant, and simple. There's no need for you to build and host your own copy of the application unless you want to customize the site in a way beyond what is already offered.

# Running Locally

To develop locally, you'll still need an active Community Ally site setup so you can make requests to the live server. If you haven't signed up for a [Condo Ally](https://login.condoally.com/#!/SignUp) or HOA Ally site yet, go ahead and do so now. It's instant and free. You're welcome to make a group specifically for development. If that's the case, please put the word "Dev" in your association name during sign-up.

1. Clone the repo
1. The site uses the subdomain to determine which group you're viewing. For example, https://123fake.condoally.com is for the 123 Fake St Condo Association and https://BrightElm.hoaally.org is for the Bright Elm HOA site. We need to override this logic while you're developing locally so you can specifiy which group to use while hosting off localhost. At the top of website\ngApp\ally-app.ts (Or ally-app.js if you haven't run 'grunt watch' yet), specify the origin of your Ally site in the OverrideBaseApiPath variable.
1. Start a local web server in the "website" directory. Make sure HTTPS is supported.

# File Structure

If you want to jump right in to changing the main UI, look in the "website\ngApp\chtn\member" directory. By the way, CHTN stands for condo, HOA, townhome, neighborhood. Those UIs share pretty much the same experience, as opposed to the home and neighborhood watch UI which is mostly separate code. Note in that "member" directory you should be able figure out which page is which by name. If you want to adjust one of the site admin pages, open the "CommunityAllyWebsite\ngApp\chtn\manager" directory.

The main app code is in "website\ngApp". Third-party libraries are in "website\js". The CSS is in the "website\assets\scss" directory, see style.scss for the breakdown.

# Development
1. Search the project for DEVLOCAL in website\index.html and follow the instructions indicated.
1. From a command line, run "npm install" then "grunt watch" in the root directory of the repo.
1. Load up the site and verify you can login.
1. Changes you make to the Angular templates or code will take effect as fast as Grunt can compile.

# Tech

Community Ally uses a number of amazing open source libraries:

* [AngularJS v1.6](https://angularjs.org/) - HTML enhanced for web apps!
* [Twitter Bootstrap v4](http://getbootstrap.com/) - great UI boilerplate for modern web apps
* [Grunt](https://gruntjs.com/) - The JavaScript task runner
* [TypeScript](https://www.typescriptlang.org/) - JavaScript that scales
* [UI-Grid](http://ui-grid.info/) - A datagrid for AngularJS

# Custom Development

We can setup, host, and modify custom sites for your community association. Simply contact us here on Github or reach out using the form at the bottom of our [home page](https://communityally.org/).

License
----

MIT
