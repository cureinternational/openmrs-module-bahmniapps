'use strict';

angular.module('bahmni.common.patient')
    .directive('patientImage', ['$document', '$injector', function ($document, $injector) {
        var STYLE_ID = 'patient-photo-preview-styles';
        var INIT_MARKER = 'patient-photo-preview-init';

        function getDoc () {
            return ($document && $document[0]) || document;
        }

        function injectStyles (doc) {
            if (doc.getElementById(STYLE_ID)) { return; }
            var style = doc.createElement('style');
            style.id = STYLE_ID;
            style.textContent = [
                'img.patient-image { cursor: pointer; }',
                '.patient-photo-dialog.ngdialog-theme-default { padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }',
                '.patient-photo-dialog.ngdialog-theme-default .ngdialog-content { background: transparent !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; width: auto !important; max-width: none !important; position: relative !important; overflow: visible !important; }',
                '.patient-photo-dialog__content { position: relative !important; display: inline-block !important; }',
                '.patient-photo-dialog__image { display: block !important; max-width: 80vw !important; max-height: 80vh !important; width: 20em !important; height: 20em !important; object-fit: contain !important; border: 1px solid #fff !important; border-radius: 4px !important; box-shadow: 0 8px 40px rgba(0,0,0,.6) !important; }',
                '.ppd-close-btn { position: absolute !important; top: -10px !important; right: -10px !important; width: 22px !important; height: 22px !important; border-radius: 50% !important; background: #fff !important; border: none !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; line-height: 22px !important; text-align: center !important; color: #333 !important; box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; padding: 0 !important; margin: 0 !important; z-index: 1 !important; display: block !important; }',
                '.ppd-close-btn:hover { background: #e0e0e0 !important; }'
            ].join('\n');
            doc.head.appendChild(style);
        }

        function setupGlobal (doc, ngDialog) {
            function onDocClick (e) {
                var t = e.target;
                if (t.tagName !== 'IMG' || !t.classList.contains('patient-image')) { return; }
                if (t.getAttribute('data-testid') === 'patient-photo') { return; }
                var src = t.getAttribute('src');
                if (!src) { return; }
                e.stopPropagation();
                ngDialog.open({
                    plain: true,
                    template: '<div class="patient-photo-dialog__content" role="dialog" aria-modal="true" aria-label="Enlarged patient photo">' +
                        '<img class="patient-photo-dialog__image" ng-src="{{ngDialogData.src}}" alt="Enlarged patient photo" />' +
                        '<button class="ppd-close-btn" ng-click="closeThisDialog()" aria-label="Close">✕</button>' +
                        '</div>',
                    className: 'ngdialog-theme-default patient-photo-dialog',
                    closeByDocument: true,
                    closeByEscape: true,
                    showClose: false,
                    data: { src: src }
                });
            }

            doc.addEventListener('click', onDocClick);

            return function cleanup () {
                doc.removeEventListener('click', onDocClick);
                var marker = doc.getElementById(INIT_MARKER);
                if (marker && marker.parentNode) {
                    marker.parentNode.removeChild(marker);
                }
            };
        }

        return {
            restrict: 'C',
            link: function (scope) {
                if (!$injector.has('ngDialog')) { return; }
                var ngDialog = $injector.get('ngDialog');
                var doc = getDoc();
                if (!doc || !doc.head || !doc.body) { return; }

                var marker = doc.getElementById(INIT_MARKER);
                if (marker) {
                    marker.dataset.count = String(Number(marker.dataset.count || '1') + 1);
                } else {
                    marker = doc.createElement('div');
                    marker.id = INIT_MARKER;
                    marker.dataset.count = '1';
                    marker.style.display = 'none';
                    doc.body.appendChild(marker);
                    injectStyles(doc);
                    marker.cleanup = setupGlobal(doc, ngDialog);
                }

                scope.$on('$destroy', function () {
                    var currentMarker = doc.getElementById(INIT_MARKER);
                    if (!currentMarker) { return; }
                    var remaining = Number(currentMarker.dataset.count || '1') - 1;
                    if (remaining > 0) {
                        currentMarker.dataset.count = String(remaining);
                        return;
                    }
                    if (currentMarker.cleanup) {
                        currentMarker.cleanup();
                    } else if (currentMarker.parentNode) {
                        currentMarker.parentNode.removeChild(currentMarker);
                    }
                });
            }
        };
    }]);
