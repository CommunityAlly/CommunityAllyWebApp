# AGENTS.md — Angular Project Instructions

## 1. Project Technologies Overview
* [AngularJS v1.8.2](https://angularjs.org/) - HTML enhanced for web apps!
* [Twitter Bootstrap v5](http://getbootstrap.com/) - great UI boilerplate for modern web apps
* [Grunt](https://gruntjs.com/) - The JavaScript task runner
* [TypeScript](https://www.typescriptlang.org/) - JavaScript that scales
* [UI-Grid](http://ui-grid.info/) - A datagrid for AngularJS

## 2. Setup & Build Commands
- Install: `npm install`
- Dev server: `grunt serve`

## 3. File Structure
Only edit \*.ts and \*.html files under website\ngApp and \*.scss files under website\assets\scss. The rest of the js, css files are generated from compiling those source ts/scss files.

If you want to jump right in to changing the main UI, look in the "website\ngApp\chtn\member" directory. By the way, CHTN stands for condo, HOA, townhome, neighborhood. Those UIs share pretty much the same experience, as opposed to the home and neighborhood watch UIs which is mostly separate code. Note in that "member" directory you should be able figure out which page is which by name. If you want to adjust one of the site admin pages, open the "CommunityAllyWebsite\ngApp\chtn\manager" directory.

The main app code is in "website\ngApp". Third-party libraries are in "website\js". The CSS is in the "website\assets\scss" directory, see style.scss for the breakdown.


## 4. Anti-Patterns (NEVER DO)
- Do NOT edit any \*.js file under website\ngApp
- Do NOT edit ally-app-bundle.\* 

## 5. Agent Workflow & Verification
- After writing code, ensure there are no TypeScript errors
- Fix any compilation or type errors before reporting completion.