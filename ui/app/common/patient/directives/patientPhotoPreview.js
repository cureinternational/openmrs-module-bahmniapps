'use strict';

angular.module('bahmni.common.patient')
    .directive('patientImage', ['$document', function ($document) {
        var BLANK_USER_RE = /blank-user/;
        var STYLE_ID = 'patient-photo-modal-style';
        var MODAL_ID = 'patient-photo-modal-overlay';

        // -- one-time setup (styles + modal + delegated listener) --
        var _initialized = false;

        function getDoc () {
            return ($document && $document[0]) || document;
        }

        function injectStyles (doc) {
            if (doc.getElementById(STYLE_ID)) { return; }
            var style = doc.createElement('style');
            style.id = STYLE_ID;
            style.textContent = [
                'img.patient-image { cursor: pointer; }',
                '#' + MODAL_ID + ' {',
                '  display: none; position: fixed; top:0; left:0;',
                '  width:100%; height:100%; z-index:10000;',
                '  align-items:center; justify-content:center; }',
                '#' + MODAL_ID + '.is-open { display: flex; }',
                '#' + MODAL_ID + ' .patient-photo-modal-backdrop {',
                '  position:absolute; top:0; left:0; width:100%; height:100%;',
                '  background:rgba(0,0,0,0.85); }',
                '#' + MODAL_ID + ' .patient-photo-modal-content {',
                '  position:relative; z-index:1; display:inline-flex;',
                '  animation: ppm-in 0.2s ease; }',
                '@keyframes ppm-in {',
                '  from { opacity:0; transform:scale(0.9); }',
                '  to   { opacity:1; transform:scale(1); } }',
                '#' + MODAL_ID + ' .patient-photo-modal-image {',
                '  display:block; max-width:80vw; max-height:80vh;',
                '  min-width:280px; min-height:280px;',
                '  width:auto; height:auto; object-fit:contain;',
                '  border:5px solid #fff; border-radius:4px;',
                '  box-shadow:0 8px 40px rgba(0,0,0,0.6); }',
                '#' + MODAL_ID + ' .patient-photo-modal-close {',
                '  position:absolute; top:-14px; right:-14px;',
                '  width:30px; height:30px; border-radius:50%;',
                '  background:#fff; border:none; font-size:20px;',
                '  line-height:1; cursor:pointer; z-index:2;',
                '  display:flex; align-items:center; justify-content:center;',
                '  color:#333; box-shadow:0 2px 8px rgba(0,0,0,0.4); padding:0; }'
            ].join('\n');
            doc.head.appendChild(style);
        }

        function buildModal (doc) {
            var overlay = doc.createElement('div');
            overlay.id = MODAL_ID;
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML =
                '<div class="patient-photo-modal-backdrop"></div>' +
                '<div class="patient-photo-modal-content">' +
                    '<button class="patient-photo-modal-close" aria-label="Close">\u00d7</button>' +
                    '<img class="patient-photo-modal-image" />' +
                '</div>';
            doc.body.appendChild(overlay);
            return overlay;
        }

        function setupGlobal (doc) {
            var overlay = buildModal(doc);
            var modalImg = overlay.querySelector('.patient-photo-modal-image');
            var backdrop = overlay.querySelector('.patient-photo-modal-backdrop');
            var closeBtn = overlay.querySelector('.patient-photo-modal-close');

            function onKeyDown (e) {
                if (e.keyCode === 27) { closeModal(); }
            }

            function openModal (src) {
                modalImg.src = src;
                overlay.classList.add('is-open');
                doc.addEventListener('keydown', onKeyDown);
            }

            function closeModal () {
                overlay.classList.remove('is-open');
                doc.removeEventListener('keydown', onKeyDown);
            }

            // delegated listener — catches clicks on ANY img.patient-image on the page
            function onDocClick (e) {
                var t = e.target;
                if (t.tagName === 'IMG' && t.classList.contains('patient-image')) {
                    var src = t.getAttribute('src');
                    if (!src || BLANK_USER_RE.test(src)) { return; }
                    e.stopPropagation();
                    openModal(src);
                } else if (t === backdrop || t.closest && t.closest('.patient-photo-modal-backdrop')) {
                    closeModal();
                } else if (t === closeBtn || t.closest && t.closest('.patient-photo-modal-close')) {
                    closeModal();
                }
            }

            doc.addEventListener('click', onDocClick);
            return onDocClick; // returned so tests can verify
        }

        return {
            restrict: 'C',
            link: function () {
                if (_initialized) { return; }
                var doc = getDoc();
                if (!doc || !doc.head || !doc.body) { return; }
                injectStyles(doc);
                setupGlobal(doc);
                _initialized = true;
            }
        };
    }]);
