import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AlignBoxMiddleLeft24 } from "@carbon/icons-react";
import PropTypes from "prop-types";
import "./DraftIndicator.scss";
import DraftOverlay from "../../Components/DraftOverlay/DraftOverlay";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import { getFormDrafts } from "../../utils/draftIndicator/draftIndicatorUtils";

export function DraftIndicator() {
    const [formDrafts, setFormDrafts] = useState([]);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [overlayPosition, setOverlayPosition] = useState({ top: 0, right: 0 });
    const buttonRef = useRef(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                const drafts = await getFormDrafts();
                setFormDrafts(drafts);
            } catch (error) {
                console.error("Failed to initialize draft indicator", error);
            }
        };
        initialize();
    }, []);

    const toggleOverlay = () => {
        if (!isOverlayOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setOverlayPosition({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        }
        setIsOverlayOpen((previous) => !previous);
    };
    const closeOverlay = () => setIsOverlayOpen(false);
    const hasDrafts = formDrafts.length > 0;

    return (
        <I18nProvider>
            <div className="draft-indicator">
                <button
                    ref={buttonRef}
                    className="draft-indicator__button"
                    onClick={toggleOverlay}
                    aria-label="View observation drafts"
                    aria-expanded={isOverlayOpen}
                >
                    <span className="draft-indicator__icon-wrapper">
                        <AlignBoxMiddleLeft24 className="draft-indicator__icon" />
                        {hasDrafts && <span className="draft-indicator__red-dot" aria-hidden="true" />}
                    </span>
                </button>
                {isOverlayOpen && ReactDOM.createPortal(
                    <div
                        className="draft-indicator__overlay-wrapper"
                        style={{ top: overlayPosition.top, right: overlayPosition.right }}
                    >
                        <DraftOverlay formDrafts={formDrafts} onClose={closeOverlay} />
                    </div>,
                    document.body
                )}
            </div>
        </I18nProvider>
    );
}

DraftIndicator.propTypes = {
    hostData: PropTypes.object,
    hostApi: PropTypes.object,
};
