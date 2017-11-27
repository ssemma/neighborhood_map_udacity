/*jshint loopfunc:true */
var bestLocations = [
    {
     id: '0',
     title: "Publix Super Market at Windover Square",
     location: { lat: 28.0775487,
                 lng: -80.65989639999999
               },
     address: "2261 W New Haven Ave, West Melbourne, FL 32904",
     article: "publix super market"
    },
    {
     id: '1',
     title: "Orlando Melbourne International Airport",
     location: { lat: 28.0977029,
                 lng: -80.631017
               },
     address: "1 Air Terminal Pkwy, Melbourne, FL 32901",
     article: "airport"
    },
    {
     id: '2',
     title: "Thai Thai House Palm Bay",
     location: { lat: 28.0379769,
                 lng: -80.6638674
               },
     address: "215 Palm Bay Rd NE, West Melbourne, FL 32904",
     article: "palm bay, florida"
    },
    {
     id: '3',
     title: "Texas Roadhouse",
     location: { lat: 27.9994443,
                 lng: -80.70264661970849
               },
     address: "1181 Malabar Rd, Palm Bay, FL 32907",
     article: "steak"
    },
    {
     id: '4',
     title: "Wawa",
     location: { lat: 28.078542,
                 lng: -80.6738737
               },
     address: "3175 W New Haven Ave, Melbourne, FL 32904",
     article: "melbourne, florida"
    }
];

// Create a new blank array for all the listing markers.
var markers = [];

// Declare global values
var map;
var largeInfowindow;

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position
function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed
        infowindow.addListener('closeclick', function(){
            infowindow.marker = null;
        });
        // Wikipedia AJAX request
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.article +
            '&format=json&callback=wikiCallback';
        var wikiRequestTimeout = setTimeout(function(){
            infowindow.setContent('<div>' + marker.title + '</div><div>failed to get wikipedia resources</div>');
        }, 8000);
        
        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            // jsonp: "callback",
            success: function( response){
                var articleList = response[1];
                for(var i = 0; i < articleList.length; i++){
                    var articleStr = articleList[i];
                    var url = 'http://en.wikipedia.org/wiki/'+ articleStr;
                    infowindow.setContent('<div>' + marker.title + '</div>'+ '<div><a href="' + url + '">' +
                        'relative wiki-article </a></div>');
                }
                clearTimeout(wikiRequestTimeout);
            }
        });
        infowindow.open(map, marker);
    }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon wil be 21px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34 ));
    return markerImage;
}

// Create knockout object for each property of the each item of the list
var listItem = function(data){
    this.title = ko.observable(data.title);
    this.location = ko.observable(data.location);
    this.address = ko.observable(data.address);
    this.id = ko.observable(data.id);
    this.article = ko.observable(data.article);
};

var ViewModel = function() {
    // self represent the viewmodel
    var self = this;
    // init map in the viewModel
    // solved the problem that cannot get the values of markers when the viewmodel get called
    this.initMap = function(){
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 28.164744, lng: -80.6849976},
            zoom: 10
        });
        
        largeInfowindow = new google.maps.InfoWindow();
        
        // Style the markers a bit. This will be our listing marker icon.
        var defaultIcon = makeMarkerIcon('0091ff');
        
        // Create a "highlighted location" marker color for when the user
        // mouses over the marker.
        var highlightedIcon = makeMarkerIcon('FFFF24');
        
        // The following group uses the location array to create an array of markers on initialize
        for (var i = 0; i < bestLocations.length; i++) {
            // Get the position from the location array
            var position = bestLocations[i].location;
            var title = bestLocations[i].title;
            var article = bestLocations[i].article;
            // Create a marker per location, and put into markers array
            var marker = new google.maps.Marker({
                position: position,
                title: title,
                animation: google.maps.Animation.DROP,
                icon: defaultIcon,
                map: map,
                id: i,
                article: article
                
            });
            // Push the marker to our array of markers
            markers.push(marker);
            // Create an onclick event to open the large infowindow at each marker
            marker.addListener('click', function() {
                populateInfoWindow(this, largeInfowindow);
            });
            // Two event listeners - one for mouseover, one for mouseout,
            // to change the colors back and forth
            marker.addListener('mouseover',function() {
                this.setIcon(highlightedIcon);
            });
            marker.addListener('mouseout', function() {
                this.setIcon(defaultIcon);
            });
        }
    };
    this.initMap();

    // Create knockout array of the list
    this.list = ko.observableArray([]);
    bestLocations.forEach(function(locationItem){
        self.list.push(new listItem(locationItem) );
    });

    // Filter the list view and markers through the search box
    this.filter = ko.observable('');
    this.filterList = ko.computed(function(){
        return ko.utils.arrayFilter(self.list(), function(locationItem){
            // The value determine the visibility of the marker
            var value = (locationItem.title().toLowerCase().indexOf(self.filter().toLowerCase()) > -1);
            markers[locationItem.id()].setVisible(value);
            return value;
        });
    }, this);

    // When the list item is clicked, the associated marker will bounce and
    // and the infowindow that associated with that marker will open too.
    this.setLocation = function(clickedItem) {
        var markerId = clickedItem.id();
        markers[markerId].setAnimation(google.maps.Animation.BOUNCE);
        // Make sure the marker only bounce once
        setTimeout(function(){
            markers[markerId].setAnimation(null);
        }, 750);
        populateInfoWindow(markers[markerId], largeInfowindow);
    };     
};

// handle google map error
var error = function(){
    alert("Google map cannot be loaded. Something went wrong. Please reload this page.");
};

// Set the width of the side navigation to 35%
function openNav() {
    document.getElementById("mySidenav").style.width = "35%";
}

// Set the width of the side navigation to 0
function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}

function startMap(){
    ko.applyBindings(new ViewModel());
}

