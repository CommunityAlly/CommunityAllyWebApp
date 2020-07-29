CA.angularApp.directive( "googleMapPolyEditor", ["$http", function ( $http )
{
    var linkFunction = function ( scope, elem, attrs )
    {
        scope.mapInfo = {
            center: { lat: 39.5, lng: -98.35 },
            zoom: 4, // 19=House level, 4=USA fills
            disableDefaultUI: !scope.enableMapControls,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            events: {
                // Occurs whenever tiles are loaded, but we disable the listener after the first so
                // this acts as an onLoaded handler
                tilesloaded: function ( map, eventName, args )
                {
                    // We only need to handle this event once to grab the map instance so don't listen again
                    google.maps.event.clearListeners( map, "tilesloaded" );
                }
            }
        };

        // Convert Google bounds to a Community Ally GpsBounds object
        scope.googlePolyToGpsBounds = function ( verts )
        {
            verts = _.map( verts, function ( v )
            {
                return { lat: v.lat(), lon: v.lng() };
            } );

            return verts;
        };


        scope.centerMapOnPoly = function ( verts )
        {
            if( !verts || verts.length === 0 )
                return;

            //  Create a new viewpoint bound
            var bounds = new google.maps.LatLngBounds();

            _.map( verts, function ( v )
            {
                bounds.extend( v );
            } );
            
            //  Fit these bounds to the map
            scope.mapInstance.fitBounds( bounds );
        };
        

        // Add the polygon that shows the current group's bounds
        scope.setGroupBounds = function ( groupBounds )
        {
            // If there is already a group shape then clear it
            if ( !groupBounds )
            {
                if ( scope.groupBoundsShape )
                {
                    scope.groupBoundsShape.setMap( null );
                    scope.groupBoundsShape = null;
                }

                return;
            }

            var path = Ally.MapUtil.gpsBoundsToGooglePoly( groupBounds );

            var polylineOptions = {
                paths: path,
                map: scope.mapInstance,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex:-1
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.groupBoundsShape = new google.maps.Polygon( polylineOptions );
        };

        // Make the map include all visible polygons
        scope.fitBoundsForPolys = function ()
        {
            var viewBounds = new google.maps.LatLngBounds();

            if( !scope.groupBoundsShape && ( !scope.currentVisiblePolys || scope.currentVisiblePolys.length === 0 ) )
                return;

            if ( scope.groupBoundsShape )
            {
                _.each( scope.groupBoundsShape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            }

            _.each( scope.currentVisiblePolys, function ( shape )
            {
                _.each( shape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Make the map include all visible points
        scope.fitBoundsForPoints = function ()
        {
            if( !scope.currentVisiblePoints || scope.currentVisiblePoints.length === 0 )
                return;

            var viewBounds = new google.maps.LatLngBounds();

            _.each( scope.currentVisiblePoints, function ( p )
            {
                viewBounds.extend( p.position );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Occurs when a polygon point has been moved and adds the delete button
        var onPointUpdatedAddDelete = function ( index )
        {
            var getDeleteButton = function( imageUrl ) { return $( "img[src$='" + imageUrl + "']" ); };

            var path = this;
            var btnDelete = getDeleteButton( path.btnDeleteImageUrl );

            if ( btnDelete.length === 0 )
            {
                var undoimg = $( "img[src$='http://maps.gstatic.com/mapfiles/undo_poly.png']" );

                undoimg.parent().css( 'height', '21px !important' );
                undoimg.parent().parent().append( '<div style="overflow-x: hidden; overflow-y: hidden; position: absolute; width: 30px; height: 27px;top:21px;"><img src="' + path.btnDeleteImageUrl + '" class="deletePoly" style="height:auto; width:auto; position: absolute; left:0;"/></div>' );

                // now get that button back again!
                btnDelete = getDeleteButton( path.btnDeleteImageUrl );
                btnDelete.hover( function () { $( this ).css( 'left', '-30px' ); return false; },
                    function () { $( this ).css( 'left', '0px' ); return false; } );
                btnDelete.mousedown( function () { $( this ).css( 'left', '-60px' ); return false; } );
            }

            // if we've already attached a handler, remove it
            if ( path.btnDeleteClickHandler )
                btnDelete.unbind( 'click', path.btnDeleteClickHandler );

            // now add a handler for removing the passed in index
            path.btnDeleteClickHandler = function ()
            {
                path.removeAt( index );
                return false;
            };
            btnDelete.click( path.btnDeleteClickHandler );
        };


        // Add the button to delete vertices on a polygon that's being edited
        var addDeleteButton = function ( poly, imageUrl )
        {
            var path = poly.getPath();
            path["btnDeleteClickHandler"] = {};
            path["btnDeleteImageUrl"] = imageUrl;

            google.maps.event.addListener( poly.getPath(), 'set_at', onPointUpdatedAddDelete );
            google.maps.event.addListener( poly.getPath(), 'insert_at', onPointUpdatedAddDelete );
        };

        scope.currentVisiblePolys = [];
        scope.currentVisiblePoints = [];

        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePolysChange = function ( newPolys )
        {
            // Clear our current array
            _.each( scope.currentVisiblePolys, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePolys = [];

            _.each( newPolys, function ( p )
            {
                var path = Ally.MapUtil.gpsBoundsToGooglePoly( p );

                var polylineOptions = {
                    paths: path,
                    clickable: typeof(p.onClick) === "function",
                    map: scope.mapInstance,
                    strokeColor: '#0000FF',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#0000FF',
                    fillOpacity: 0.35,
                };

                var newShape = new google.maps.Polygon( polylineOptions );
                newShape.polyInfo = p;
                p.mapShapeObject = newShape;
                scope.currentVisiblePolys.push( newShape );

                if( polylineOptions.clickable )
                {
                    google.maps.event.addListener( newShape, 'click', function ()
                    {
                        newShape.polyInfo.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPolys();
        };


        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePointsChange = function ( newPoints )
        {
            // Clear our current array
            _.each( scope.currentVisiblePoints, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePoints = [];

            _.each( newPoints, function ( p )
            {
                var newMarker = new google.maps.Marker( {
                    position: { lat: p.lat, lng: p.lon },
                    map: scope.mapInstance,
                    title: p.fullAddress
                } );

                newMarker.pointSource = p;

                scope.currentVisiblePoints.push( newMarker );

                if( typeof(p.onClick) === "function" )
                {
                    google.maps.event.addListener( newMarker, 'click', function ()
                    {
                        newMarker.pointSource.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPoints();
        };


        // Occurs when the GpsBounds we're editing change
        scope.onEditPolyChange = function ( newGpsBounds )
        {
            if ( !newGpsBounds )
            {
                if ( scope.activeShape )
                    scope.activeShape.setMap( null );
                scope.activeShape = null;

                return;
            }

            var path = _.map( newGpsBounds.vertices, function ( v )
            {
                return new google.maps.LatLng( v.lat, v.lon );
            } );

            scope.centerMapOnPoly( path );

            var polylineOptions = {
                paths: path,
                editable: true,
                draggable: true,
                clickable: true,
                map: scope.mapInstance,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.activeShape = new google.maps.Polygon( polylineOptions );
            
            var onPointUpdated = function ()
            {
                scope.editPolyVerts.vertices = scope.googlePolyToGpsBounds( scope.activeShape.getPath().getArray() );
            };

            google.maps.event.addListener( scope.activeShape.getPath(), 'set_at', onPointUpdated );
            google.maps.event.addListener( scope.activeShape.getPath(), 'insert_at', onPointUpdated );

            addDeleteButton( scope.activeShape, 'http://i.imgur.com/RUrKV.png' );

            return scope.activeShape;
        };


        // detect outside changes and update our input
        scope.$watch( 'editPolyVerts', function ( newPoly )
        {
            scope.onEditPolyChange( newPoly );
        } );

        scope.$watch( 'visiblePolys', function ( newPolys )
        {
            scope.onVisiblePolysChange( newPolys );
        } );

        scope.$watch( 'visiblePoints', function ( newPoints )
        {
            scope.onVisiblePointsChange( newPoints );
        } );

        scope.$watch( 'groupBoundsPoly', function ( newGroupBoundsPoly )
        {
            scope.setGroupBounds( newGroupBoundsPoly );
        } );

        scope.$watch( 'mapCenter', function ( newMapCenter )
        {
            if( !newMapCenter )
                return;

            newMapCenter = new google.maps.LatLng( newMapCenter.lat, newMapCenter.lon );

            scope.mapInstance.setCenter( newMapCenter );
        } );

        scope.mapInstance = new google.maps.Map( $( elem ).children( ".google-map-canvas" )[0], scope.mapInfo );

        if( scope.onMapEditorReady )
            scope.onMapEditorReady( { mapInstance: scope.mapInstance } );

        google.maps.event.addListener( scope.mapInstance, 'click', function ( mouseEvent )
        {
            var southWest = {
                lat: mouseEvent.latLng.lat(),
                lon: mouseEvent.latLng.lng()
            };
            var northEast = {
                lat: mouseEvent.latLng.lat() + 0.01,
                lon: mouseEvent.latLng.lng() + 0.01
            };

            var vertices = [
                southWest,
                { lat: northEast.lat, lon: southWest.lon },
                northEast,
                { lat: southWest.lat, lon: northEast.lon }
            ];

            if( scope.editPolyVerts )
                scope.editPolyVerts.vertices = vertices;
            scope.onEditPolyChange( scope.editPolyVerts );

            //var newShape = createPolygon( map, vertices );

            //newShape.myName = "Name" + ( Math.floor( Math.random() * 10000 ) );

            //google.maps.event.addListener( newShape, 'click', function ()
            //{
            //    $scope.$apply( function ()
            //    {
            //        $scope.geoJsonString = makeGeoJson( newShape );
            //    } );
            //} );
        } );
    };

    return {
        scope: {
            editPolyVerts: "=",
            visiblePolys: "=",
            visiblePoints: "=",
            groupBoundsPoly: "=",
            mapCenter: "=",
            onMapEditorReady: "&",
            enableMapControls: "="
        },
        restrict: 'E',
        replace: 'true',
        templateUrl: '/ngApp/services/GoogleMapPolyEditorTemplate.html',
        link: linkFunction
    };
}] );