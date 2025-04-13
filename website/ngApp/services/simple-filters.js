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
        const trimmedString = tel.toString().trim().replace(/^\+/, '');
        if (trimmedString.match(/[^0-9]/)) {
            return tel;
        }
        let countryCode;
        let city;
        let phoneNumber;
        switch (trimmedString.length) {
            case 7: // ####### -> ###-####
                countryCode = "1";
                city = "";
                phoneNumber = trimmedString;
                break;
            case 10: // +1PPP####### -> C (PPP) ###-####
                countryCode = "1";
                city = trimmedString.slice(0, 3);
                phoneNumber = trimmedString.slice(3);
                break;
            case 11: // +CPPP####### -> CCC (PP) ###-####
                countryCode = trimmedString[0];
                city = trimmedString.slice(1, 4);
                phoneNumber = trimmedString.slice(4);
                break;
            case 12: // +CCCPP####### -> CCC (PP) ###-####
                countryCode = trimmedString.slice(0, 3);
                city = trimmedString.slice(3, 5);
                phoneNumber = trimmedString.slice(5);
                break;
            default:
                city = "";
                return tel;
        }
        // Ignore USA
        if (countryCode === "1")
            countryCode = "";
        phoneNumber = phoneNumber.slice(0, 3) + '-' + phoneNumber.slice(3);
        if (city.length > 0)
            city = "(" + city + ")";
        return (countryCode + " " + city + " " + phoneNumber).trim();
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
