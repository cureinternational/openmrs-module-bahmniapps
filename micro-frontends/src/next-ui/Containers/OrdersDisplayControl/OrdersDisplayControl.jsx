import React from "react";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { ViewOrders } from "../../Components/ViewOrders/ViewOrders";

export function OrdersDisplayControl({ hostData }) {
    const { translationKey } = hostData
    return <I18nProvider>
        <h2 className={"section-title-next-ui"}>
            <FormattedMessage id={translationKey} defaultMessage={translationKey} />
        </h2>
        <div>
            <ViewOrders
                orders={[
                    {
                        name: "New Cast - Plaster",
                        createdBy: "Other Doctor",
                        createdAt: "2026-02-04T10:01:00",
                        updatedAt: "2026-02-04T13:01:00",
                        orderStatus: "New",
                        statusUpdatedBy: "Super Man",
                        owner: "Wedise Mekonnen",
                        ownerUpdatedBy: "Super Man",
                        notes: "cwecvewve",
                        notesUpdatedBy: "Super Man",
                    },
                    {
                        name: "NWB",
                        createdBy: "Super Man",
                        createdAt: "2026-02-04T07:01:00",
                        updatedAt: "2026-02-04T13:01:00",
                        orderStatus: "Acknowledged",
                        statusUpdatedBy: "Super Man",
                        owner: "Wedise Mekonnen",
                        ownerUpdatedBy: "Super Man",
                        notes: "cwecvewve",
                        notesUpdatedBy: "Super Man",
                    }
                ]}
            />
        </div>
    </I18nProvider>
}

OrdersDisplayControl.propTypes = {
    hostData: PropTypes.object.isRequired,
    hostApi: PropTypes.object.isRequired,
};
