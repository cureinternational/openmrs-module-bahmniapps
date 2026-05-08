import React, { useState } from "react";
import PropTypes from "prop-types";
import {
    Table,
    TableHead,
    TableHeader,
    TableRow,
    TableBody,
    TableCell,
} from "carbon-components-react";
import { ChevronDown16, ChevronUp16 } from "@carbon/icons-react";
import { I18nProvider } from "../i18n/I18nProvider";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "./VariableDoseProtocolTable.scss";

var vdpHeaders = [
    { key: "stageName", header: "Stage" },
    { key: "dose", header: "Dose" },
    { key: "frequency", header: "Frequency" },
    { key: "duration", header: "Duration" },
];

var detailFields = [
    { key: "instructions", label: "Instructions" },
    { key: "rate", label: "Rate (ml/hr)" },
    { key: "additives", label: "Additives" },
    { key: "additionalInstructions", label: "Additional Instructions" },
];

function ExpandedDetails(props) {
    var stage = props.stage;
    var fields = detailFields.filter(function (f) { return !!stage[f.key]; });

    if (fields.length === 0) return null;

    return (
        <div className="vdp-expanded-details">
            {fields.map(function (f, i) {
                return (
                    <div key={f.key} className={"vdp-detail-item" + (i < fields.length - 1 ? " vdp-detail-item--separator" : "")}>
                        <div className="vdp-detail-label">{f.label}</div>
                        <div className="vdp-detail-value">{stage[f.key]}</div>
                    </div>
                );
            })}
        </div>
    );
}

ExpandedDetails.propTypes = {
    stage: PropTypes.object.isRequired,
};

function VariableDoseProtocolTableInner(props) {
    var hostData = props.hostData;
    var [expandedRows, setExpandedRows] = useState({});

    if (!hostData || !hostData.stages || hostData.stages.length === 0) {
        return null;
    }

    var allExpanded = hostData.stages.every(function (_, i) { return !!expandedRows[i]; });

    var toggleRow = function (index) {
        setExpandedRows(function (prev) {
            var next = Object.assign({}, prev);
            next[index] = !prev[index];
            return next;
        });
    };

    var toggleAll = function () {
        var expanded = {};
        hostData.stages.forEach(function (_, i) { expanded[i] = !allExpanded; });
        setExpandedRows(expanded);
    };

    return (
        <div className="next-ui vdp-section">
            <p className="vdp-title">Variable Dosage Protocol</p>
            <Table className="vdp-table">
                <TableHead>
                    <TableRow>
                        <TableHeader className="vdp-expand-col">
                            <button
                                type="button"
                                className="vdp-expand-btn"
                                onClick={toggleAll}
                                aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}
                            >
                                {allExpanded ? <ChevronUp16 /> : <ChevronDown16 />}
                            </button>
                        </TableHeader>
                        {vdpHeaders.map(function (h) {
                            return <TableHeader key={h.key}>{h.header}</TableHeader>;
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {hostData.stages.map(function (stage, index) {
                        var isExpanded = !!expandedRows[index];
                        var hasDetails = detailFields.some(function (f) { return !!stage[f.key]; });
                        return (
                            <React.Fragment key={index}>
                                <TableRow className="vdp-data-row">
                                    <TableCell className="vdp-expand-cell">
                                        {hasDetails && (
                                            <button
                                                type="button"
                                                className="vdp-expand-btn"
                                                onClick={function () { toggleRow(index); }}
                                                aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                            >
                                                {isExpanded ? <ChevronUp16 /> : <ChevronDown16 />}
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell>{stage.stageName}</TableCell>
                                    <TableCell>{stage.dose} {stage.unit}</TableCell>
                                    <TableCell>{stage.frequency}</TableCell>
                                    <TableCell>{stage.duration}</TableCell>
                                </TableRow>
                                {isExpanded && hasDetails && (
                                    <TableRow className="vdp-expanded-content-row">
                                        <TableCell />
                                        <TableCell colSpan={4} className="vdp-expanded-cell">
                                            <ExpandedDetails stage={stage} />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

export function VariableDoseProtocolTable(props) {
    return (
        <I18nProvider>
            <VariableDoseProtocolTableInner {...props} />
        </I18nProvider>
    );
}

VariableDoseProtocolTable.propTypes = {
    hostData: PropTypes.shape({
        stages: PropTypes.arrayOf(
            PropTypes.shape({
                stageName: PropTypes.string,
                dose: PropTypes.string,
                unit: PropTypes.string,
                frequency: PropTypes.string,
                duration: PropTypes.string,
                instructions: PropTypes.string,
                rate: PropTypes.string,
                additives: PropTypes.string,
                additionalInstructions: PropTypes.string,
            })
        ),
    }),
};
