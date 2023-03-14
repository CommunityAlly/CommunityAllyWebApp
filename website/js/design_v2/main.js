$( document ).ready( function ()
{


    $( function ()
    {
        $( "#tabs" ).tabs().addClass( "ui-tabs-vertical ui-helper-clearfix" );
        $( "#tabs li" ).removeClass( "ui-corner-top" ).addClass( "ui-corner-left" );
    } );

    $( '.history_link' ).click( function ()
    {
        $( '.payment_history' ).show( '' );
        $( '.pm_info' ).hide();
    } );
    $( '.hide' ).click( function ()
    {
        $( this ).parent().hide( '' );
    } );
    $( '.pm_info_info' ).click( function ()
    {
        $( '.pm_info' ).show( '' );
        $( '.payment_history' ).hide( '' );
    } );
    $( '.file_item' ).click( function ()
    {
        $( '.file_item' ).removeClass( 'select' );
        $( this ).toggleClass( 'select' );

    } );
} );
( function ( $ )
{
    $( window ).load( function ()
    {

        $( ".content_tab" ).mCustomScrollbar( {

        } );

    } );
} )( jQuery );


