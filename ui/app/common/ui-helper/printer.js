'use strict';

angular.module('bahmni.common.uiHelper')
    .factory('printer', ['$rootScope', '$compile', '$http', '$timeout', '$q', 'spinner',
        function ($rootScope, $compile, $http, $timeout, $q, spinner) {
            // iPadOS reports platform as 'MacIntel' (same as real Macs) since iOS 13, but only
            // touchscreen devices report maxTouchPoints > 1 - this combination isolates iPad
            // without false-positiving on Intel/M1 Macs (trackpad/mouse report 0 touch points).
            const IOS_PRINT_TIMEOUT = 2000;
            var isIPad = function () {
                return /iPad/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            };

            var IOS_PRINT_CONTAINER_ID = 'bahmni-ios-print-container';
            var IOS_PRINT_STYLE_ID = 'bahmni-ios-print-style';

            // iOS WebKit does not print an iframe's own content - contentWindow.print() on iOS
            // falls back to printing the top-level document instead of the iframe. So for iPad,
            // inject the content directly into the current page and print the top-level window
            // itself, using @media print to hide everything else while printing.
            var ensureIOSPrintStyle = function () {
                if (document.getElementById(IOS_PRINT_STYLE_ID)) {
                    return;
                }
                var style = document.createElement('style');
                style.id = IOS_PRINT_STYLE_ID;
                style.innerHTML =
                    '#' + IOS_PRINT_CONTAINER_ID + ' { display: none; }' +
                    '@media print {' +
                    '  body.ios-printing-active > *:not(#' + IOS_PRINT_CONTAINER_ID + ') { display: none !important; }' +
                    '  #' + IOS_PRINT_CONTAINER_ID + ' { display: block !important; }' +
                    '}';
                document.head.appendChild(style);
            };

            var printHtmlOnIOS = function (html) {
                var deferred = $q.defer();
                var resolved = false;
                ensureIOSPrintStyle();
                var container = document.getElementById(IOS_PRINT_CONTAINER_ID);
                if (!container) {
                    container = document.createElement('div');
                    container.id = IOS_PRINT_CONTAINER_ID;
                    document.body.appendChild(container);
                }
                container.innerHTML = html;
                document.body.classList.add('ios-printing-active');

                var cleanup = function () {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    document.body.classList.remove('ios-printing-active');
                    container.innerHTML = '';
                    window.removeEventListener('afterprint', cleanup);
                    deferred.resolve();
                };
                window.addEventListener('afterprint', cleanup);
                window.print();
                // iOS does not always fire 'afterprint' reliably, so fall back to a timed cleanup
                $timeout(cleanup, IOS_PRINT_TIMEOUT);

                return deferred.promise;
            };

            var printHtml = function (html) {
                if (isIPad()) {
                    return printHtmlOnIOS(html);
                }
                var deferred = $q.defer();
                var hiddenFrame = $('<iframe style="visibility: hidden"></iframe>').appendTo('body')[0];
                hiddenFrame.contentWindow.printAndRemove = function () {
                    hiddenFrame.contentWindow.print();
                    $(hiddenFrame).remove();
                    deferred.resolve();
                };
                var htmlContent = "<!doctype html>" +
                        "<html>" +
                            '<body onload="printAndRemove();">' +
                                html +
                            '</body>' +
                        "</html>";
                var doc = hiddenFrame.contentWindow.document.open("text/html", "replace");
                doc.write(htmlContent);
                doc.close();
                return deferred.promise;
            };

            var openNewWindow = function (html) {
                var newWindow = window.open("printTest.html");
                newWindow.addEventListener('load', function () {
                    $(newWindow.document.body).html(html);
                }, false);
            };

            var print = function (templateUrl, data, pageTitle) {
                if ($rootScope.isBeingPrinted) {
                    return;
                }
                pageTitle = pageTitle || null;
                $rootScope.isBeingPrinted = true;
                $http.get(templateUrl).then(function (templateData) {
                    var template = templateData.data;
                    var printScope = $rootScope.$new();
                    angular.extend(printScope, data);
                    var element = $compile($('<div>' + template + '</div>'))(printScope);
                    var renderAndPrintPromise = $q.defer();
                    var originalTitle = angular.element(document).prop('title');
                    pageTitle ? angular.element(document).prop('title', pageTitle) : angular.element(document).prop('title', originalTitle);
                    var waitForRenderAndPrint = function () {
                        if (printScope.$$phase || $http.pendingRequests.length) {
                            $timeout(waitForRenderAndPrint, 1000);
                        } else {
                        // Replace printHtml with openNewWindow for debugging
                            printHtml(element.html()).then(function () {
                                $rootScope.isBeingPrinted = false;
                                renderAndPrintPromise.resolve();
                                angular.element(document).prop('title', originalTitle);
                            });
                            printScope.$destroy();
                        }
                        return renderAndPrintPromise.promise;
                    };
                    spinner.forPromise(waitForRenderAndPrint());
                }, function () {
                    $rootScope.isBeingPrinted = false;
                });
            };

            var printFromScope = function (templateUrl, scope, afterPrint) {
                if ($rootScope.isBeingPrinted) {
                    return;
                }
                $rootScope.isBeingPrinted = true;
                $http.get(templateUrl).then(function (response) {
                    var template = response.data;
                    var printScope = scope;
                    var element = $compile($('<div>' + template + '</div>'))(printScope);
                    var renderAndPrintPromise = $q.defer();
                    var originalTitle = angular.element(document).prop('title');
                    printScope.pageTitle ? angular.element(document).prop('title', printScope.pageTitle) : angular.element(document).prop('title', originalTitle);
                    var waitForRenderAndPrint = function () {
                        if (printScope.$$phase || $http.pendingRequests.length) {
                            $timeout(waitForRenderAndPrint);
                        } else {
                            printHtml(element.html()).then(function () {
                                $rootScope.isBeingPrinted = false;
                                if (afterPrint) {
                                    afterPrint();
                                }
                                renderAndPrintPromise.resolve();
                                angular.element(document).prop('title', originalTitle);
                            });
                        }
                        return renderAndPrintPromise.promise;
                    };
                    spinner.forPromise(waitForRenderAndPrint());
                }, function () {
                    $rootScope.isBeingPrinted = false;
                });
            };
            return {
                print: print,
                printFromScope: printFromScope
            };
        }]);
