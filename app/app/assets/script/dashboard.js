var socket = io(),
    uid = 1001,
    map, greenIcon, redIcon, markerGroup,bindex=1;

jQuery('#myTab a').on('click', function(e) { // activare tab-uri
    e.preventDefault()
    $(this).tab('show')
})

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // hash 32bit pentru eliberare cod, momentan in lucru
    }
    return hash;
}

function render() { // apelat pentru a afisa harta
    markerGroup.clearLayers();
    for (var i = scope.xdata.list.length - 1; i >= 0; i--) {
        if (scope.xdata.users[0].visited.filter(el => el == scope.xdata.list[i].id).length == 0) {
            L.marker([scope.xdata.list[i].lat, scope.xdata.list[i].long], {
                icon: redIcon
            }).bindPopup(scope.xdata.list[i].name).addTo(markerGroup);
        } else {
            L.marker([scope.xdata.list[i].lat, scope.xdata.list[i].long], {
                icon: greenIcon
            }).bindPopup(scope.xdata.list[i].name).addTo(markerGroup);
        }
    }
}

function switchbg() { // apelat pentru a afisa harta
    bindex++;
    if(bindex==4) { bindex=1; }
    url = '/static/bg'+bindex+'.jpg';
    $('body').fadeTo('slow', 0.8, function()
    {
        $(this).css('background-image', 'url(' + url + ')');
    }).fadeTo('slow', 1);
}

$(document).ready(function() {
    setInterval(function(){switchbg();},20000);
    map = L.map('map').setView([46, 25], 6);
    markerGroup = L.layerGroup().addTo(map);

    L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', { // stil minimalist harta
        attribution: '&copy; OSM Project, CartoDB tileserver'
    }).addTo(map);
    LeafIcon = L.Icon.extend({
        options: {
            iconSize: [28, 45]
        }
    });

    greenIcon = new LeafIcon({
        iconUrl: '/static/green.png' // vizitat
    });
    redIcon = new LeafIcon({
        iconUrl: '/static/red.png' // asteapta sa fie vizitat
    });


    //intrebari din tag data html
    var answersLeft = [];
    $('.quiz-wrapper').find('span.option').each(function(i) {
        var $this = $(this);
        var answerValue = $this.data('target');
        var $target = $('.answers .target[data-accept="' + answerValue + '"]');
        var labelText = $this.html();
        $this.draggable({
            revert: "invalid",
            containment: ".quiz-wrapper"
        });

        if ($target.length > 0) {
            $target.droppable({ // drag drop cu jquery ui
                accept: 'span.option[data-target="' + answerValue + '"]',
                drop: function(event, ui) {
                    $this.draggable('destroy');
                    $this.removeClass('badge-pill');
                    $this.removeClass('badge-secondary');
                    $target.droppable('destroy');
                    $this.html('&nbsp;');
                    $target.html(labelText);
                    answersLeft.splice(answersLeft.indexOf(answerValue), 1);
                }
            });
            answersLeft.push(answerValue);
        } else {}
    });
    $('.quiz-wrapper button[type="submit"]').click(function() {
        if (answersLeft.length > 0) {
            $('.lightbox-bg').show();
            $('.status.deny').show();
            $('.lightbox-bg').click(function() {
                $('.lightbox-bg').hide();
                $('.status.deny').hide();
                $('.lightbox-bg').unbind('click');
            });
            scope.$apply(function() {
                scope.xdata.users[0].points -= 1;
                save();
            });
        } else {
            $('.lightbox-bg').show();
            $('.status.confirm').show();
            scope.$apply(function() {
                scope.xdata.users[0].points += 17;
                g.refresh(scope.xdata.users[0].points);
                save();
            });
        }
    });
});

socket.on('start', function(data) { // initial  sau primire date
    scope = angular.element($("#get")).scope(); // get scope in afara angularjs
    var array = data;
    scope.$apply(function() {
        scope.xdata = array;
        g.refresh(scope.xdata.users[0].points);
        render();
    });
});

$('#mapModal').on('shown.bs.modal', function(e) {
    map.invalidateSize();
})

socket.on('device', function(data) { // initial 
    $('#acc').append('<li class="list-group-item">Pentru utilizator ' + uid + ' | ' + Date() + '</li>');
});

function save() { // modificare lista din GUI 
    socket.emit('save', JSON.stringify(scope.xdata));
    $('#editModal').modal('hide');
}

var myApp = angular.module('explore100', ["xeditable"]);
myApp.controller('dashboard', ['$scope', '$window', function($scope, $window) {
    $scope.uid = $window.uid;
    $scope.perc = function(x, y) { // calcul procent
        return parseFloat((z = (x / y) * 100).toFixed(0));
    }

    $scope.isVisited = function(x) { // pentru filtrarea listei
        for (var i = $scope.xdata.users[0].visited.length - 1; i >= 0; i--) {
            if ($scope.xdata.users[0].visited[i] == x + 1) return true;
        }
        return false;
    }

    $scope.addObj = function() {
        $scope.xdata.list.push({
            "id": $scope.xdata.list[$scope.xdata.list.length].id + 1,
            "name": "Introduceți numele...",
            "lat": 0,
            "long": 0,
            "desc": "Introduceți descrierea..."
        });
    }

}]);

myApp.run(['editableOptions', function(editableOptions) {
  editableOptions.theme = 'bs3';
}]);