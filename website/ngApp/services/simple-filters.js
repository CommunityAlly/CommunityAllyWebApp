// Allow conditional inline values
// From http://stackoverflow.com/questions/14164371/inline-conditionals-in-angular-js
CA.angularApp.filter('iif', function () {
    return function (input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
    };
});
CA.angularApp.filter('tel', function () {
    return function (tel) {
        if (!tel) {
            return '';
        }
        var value = tel.toString().trim().replace(/^\+/, '');
        if (value.match(/[^0-9]/)) {
            return tel;
        }
        var country, city, number;
        switch (value.length) {
            case 7: // ####### -> ###-####
                country = 1;
                city = "";
                number = value;
                break;
            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice(0, 3);
                number = value.slice(3);
                break;
            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice(1, 4);
                number = value.slice(4);
                break;
            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice(0, 3);
                city = value.slice(3, 5);
                number = value.slice(5);
                break;
            default:
                city = "";
                return tel;
        }
        // Ignore USA
        if (country === 1)
            country = "";
        number = number.slice(0, 3) + '-' + number.slice(3);
        if (city.length > 0)
            city = "(" + city + ")";
        return (country + " " + city + " " + number).trim();
    };
});
CA.angularApp.filter("filesize", function () {
    return function (size) {
        if (isNaN(size))
            size = 0;
        if (size < 1024)
            return size + " bytes";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " KB";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " MB";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " GB";
        size /= 1024;
        return size.toFixed(2) + " TB";
    };
});
