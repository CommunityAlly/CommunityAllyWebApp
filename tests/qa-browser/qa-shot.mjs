// Logs in to the QA site and saves screenshots of one or more pages as QA evidence.
//
// Usage:
//   node qa-shot.mjs [--path "#!/Home"] [--path "#!/Calendar"] [--out <dir>] [--headed] [--full-page]
//
// Env:
//   QA_SITE_PASSWORD  (required) never printed
//   QA_SITE_USERNAME  (optional) defaults to the shared QA test account
//   QA_SITE_URL       (optional) defaults to https://qa.condoally.com/
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DefaultUsername = "taylon5+allyaitest@gmail.com";
const DefaultSiteUrl = "https://qa.condoally.com/";

function parseArgs( argv )
{
    const args = { paths: [], outDir: null, headed: false, fullPage: false };
    for( let i = 0; i < argv.length; ++i )
    {
        const a = argv[i];
        if( a === "--path" )
            args.paths.push( argv[++i] );
        else if( a === "--out" )
            args.outDir = argv[++i];
        else if( a === "--headed" )
            args.headed = true;
        else if( a === "--full-page" )
            args.fullPage = true;
        else
            throw new Error( `Unknown argument: ${a}` );
    }

    if( args.paths.length === 0 )
        args.paths.push( null ); // null = whatever page the site lands on after login

    args.outDir = args.outDir || process.env.PAPERCLIP_RUN_SCRATCH_DIR || process.env.PAPERCLIP_SCRATCH_DIR || path.resolve( "qa-screenshots" );
    return args;
}

// Launch the system Edge/Chrome when available so no browser download is needed
async function launchBrowser( headed )
{
    for( const channel of ["msedge", "chrome", undefined] )
    {
        try
        {
            return await chromium.launch( { channel, headless: !headed } );
        }
        catch( err )
        {
            if( channel === undefined )
                throw err;
        }
    }
}

function slugify( pagePath )
{
    return ( pagePath || "landing" ).replace( /[^a-z0-9]+/gi, "-" ).replace( /^-|-$/g, "" ).toLowerCase() || "landing";
}

async function main()
{
    const password = process.env.QA_SITE_PASSWORD;
    if( !password )
        throw new Error( "QA_SITE_PASSWORD is not set" );

    const username = process.env.QA_SITE_USERNAME || DefaultUsername;
    const siteUrl = new URL( process.env.QA_SITE_URL || DefaultSiteUrl );
    const args = parseArgs( process.argv.slice( 2 ) );
    fs.mkdirSync( args.outDir, { recursive: true } );

    const browser = await launchBrowser( args.headed );
    try
    {
        const page = await browser.newPage( { viewport: { width: 1366, height: 900 } } );
        page.setDefaultTimeout( 30000 );

        await page.goto( new URL( "#!/Login", siteUrl ).href );
        await page.locator( "#login-email-textbox" ).fill( username );
        await page.locator( "#login-password-textbox" ).fill( password );
        await page.locator( "#login-button" ).click();

        // Success = we leave the login route; failure = error label or MFA prompt shows up
        const outcome = await Promise.race( [
            page.waitForURL( url => !/#!\/Login/i.test( url.href ), { timeout: 30000 } ).then( () => "ok" ),
            page.locator( "#error-label" ).filter( { hasText: /\S/ } ).waitFor( { timeout: 30000 } ).then( () => "error" ),
            page.locator( "[data-ng-if='$ctrl.isEnteringMfaCode']" ).waitFor( { timeout: 30000 } ).then( () => "mfa" )
        ] );

        if( outcome === "error" )
        {
            const msg = ( await page.locator( "#error-label" ).innerText() ).split( password ).join( "***" );
            throw new Error( `Login failed: ${msg}` );
        }
        if( outcome === "mfa" )
            throw new Error( "Login requires an MFA code; the QA account must have MFA disabled for automation" );

        console.log( `Logged in as ${username}` );

        for( const pagePath of args.paths )
        {
            if( pagePath )
                await page.goto( new URL( pagePath, siteUrl ).href );

            await page.waitForLoadState( "networkidle" ).catch( () => {} );
            const file = path.join( args.outDir, `qa-${slugify( pagePath )}-${Date.now()}.png` );
            await page.screenshot( { path: file, fullPage: args.fullPage } );
            console.log( `Screenshot: ${file} (${page.url()})` );
        }
    }
    finally
    {
        await browser.close();
    }
}

main().catch( err =>
{
    // Belt and braces: never let the password reach logs
    const pw = process.env.QA_SITE_PASSWORD;
    let msg = String( err && err.stack || err );
    if( pw )
        msg = msg.split( pw ).join( "***" );
    console.error( msg );
    process.exit( 1 );
} );
