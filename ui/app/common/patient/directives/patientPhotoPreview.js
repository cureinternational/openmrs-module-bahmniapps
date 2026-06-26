'use strict';

angular.module('bahmni.common.patient')
    .directive('patientImage', ['$document', function ($document) {
        var BLANK_USER_RE = /blank-user/;
        var STYLE_ID = 'patient-photo-modal-style';

        function injectStyles () {
            var doc = ($document && $document[0]) || document;
            if (!doc || !doc.head) { return; }
            if (doc.getElementById(STYLE_ID)) { return; }
            var style = doc.createElement('style');
            style.id = STYLE_ID;
            style.textContent = [
                'img.patient-image { cursor: pointer; }',
                '.patient-photo-modal-overlay {',
                '  display: none; position: fixed; top:0; left:0;',
                '  width:100%; height:100%; z-index:10000;',
                '  align-items:center; justify-content:center; }',
                '.patient-photo-modal-overlay.is-open { display: flex; }',
                '.patient-photo-modal-backdrop {',
                '  position:absolute; top:0; left:0; width:100%; height:100%;',
                '  background:rgba(0,0,0,0.85); }',
                '.patient-photo-modal-content {',
                '  position:relative; z-index:1; display:inline-flex;',
                '  animation: ppm-in 0.2s ease; }',
                '@keyframes ppm-in {',
                '  from { opacity:0; transform:scale(0.9); }',
                '  to   { opacity:1; transform:scale(1); } }',
                '.patient-photo-modal-image {',
                '  display:block; max-width:80vw; max-height:80vh;',
                '  min-width:280px; min-height:280px;',
                '  width:auto; height:auto; object-fit:contain;',
                '  border:5px solid #fff; border-radius:4px;',
                '  box-shadow:0 8px 40px rgba(0,0,0,0.6); }',
                '.patient-photo-modal-close {',
                '  position:absolute; top:-14px; right:-14px;',
                '  width:30px; height:30px; border-radius:50%;',
                '  background:#fff; border:none; font-size:20px;',
                '  line-height:1; cursor:pointer; z-index:2;',
                '  display:flex; align-items:center; justify-content:center;',
                '  color:#333; box-shadow:0 2px 8px rgba(0,0,0,0.4); padding:0; }'
            ].join('\n');
            doc.head.appendChild(style);
        }

        return {
            restrict: 'C',
            link: function (scope, element) {
                injectStyles();

                var overlayEl = angular.element(
                    '<div class="patient-photo-modal-overlay" role="dialog" aria-modal="true">' +
                        '<div class="patient-photo-modal-backdrop"></div>' +
                        '<div class="patient-photo-modal-content">' +
                            '<button class="patient-photo-modal-close" aria-label="Close">&times;</button>' +
                            '<img class="patient-photo-modal-image" />' +
                        '</div>' +
                    '</div>'
                );

                var overlayDom = overlayEl[0];
                var modalImg  = angular.element(overlayDom.querySelector('.patient-photo-modal-image'));
                var backdrop  = angular.element(overlayDom.querySelector('.patient-photo-modal-backdrop'));
                var closeBtn  = angular.element(overlayDom.querySelector('.patient-photo-modal-close'));

                angular.element(document.body).append(overlayEl);

                function onKeyDown (e) {
                    if (e.keyCode === 27) { closeModal(); }
                }

                function openModal (src) {
                    modalImg.attr('src', src);
                    overlayEl.addClass('is-open');
                    angular.element(document).on('keydown', onKeyDown);
                }

                function closeModal () {
                    overlayEl.removeClass('is-open');
                    angular.element(document).off('keydown', onKeyDown);
                }

                function onImgClick (e) {
                    var src = element.attr('src');
                    if (!src || BLANK_USER_RE.test(src)) { return; }
                    e.stopPropagation();
                    e.preventDefault();
                    openModal(src);
                }

                backdrop.on('click', closeModal);
                closeBtn.on('click', closeModal);
                element.on('click', onImgClick);

                scope.$on('$destroy', function () {
                    element.off('click', onImgClick);
                    backdrop.off('click', closeModal);
                    closeBtn.off('click', closeModal);
                    angular.element(document).off('keydown', onKeyDown);
                    overlayEl.remove();
                });
            }
        };
    }]);
