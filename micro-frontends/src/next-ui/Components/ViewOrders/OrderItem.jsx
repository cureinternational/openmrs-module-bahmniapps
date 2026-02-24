import PropTypes from "prop-types";
import {ChevronUp, ChevronDown} from "@carbon/icons-react/next";
import {useState} from "react";
import {Accordion} from "./Accordion";
import "./OrderItem.scss";

function OrderItem({name, value, updatedBy}) {
    const [isOpen, setIsOpen] = useState(false)
    return <div className="order-item-wrapper">
        <div className="order-item-header" onClick={() => setIsOpen(!isOpen)}>
            <div>{name}</div>
            <div>{value}</div>
            <div className="order-item-chevron">{isOpen ? <ChevronUp/> : <ChevronDown/>}</div>
        </div>
        {isOpen && <div className="order-item-details">{updatedBy}</div>}
    </div>
}

export function OrderItemContainer(props) {
    const {updatedAt, orderStatus, statusUpdatedBy, owner, ownerUpdatedBy, notes, notesUpdatedBy} = props;

    const header = <span>{updatedAt}</span>;

    return (
        <Accordion
            header={header}
            defaultOpen={true}
            className="order-item-container"
        >
            <div>
                <OrderItem updatedBy={statusUpdatedBy} name={"Status"} value={orderStatus}/>
                <OrderItem updatedBy={ownerUpdatedBy} name={"Owner"} value={owner}/>
                <OrderItem updatedBy={notesUpdatedBy} name={"Notes"} value={notes}/>
            </div>
        </Accordion>
    );
}

OrderItem.propTypes = {
    name: PropTypes.string,
    value: PropTypes.string,
    updatedBy: PropTypes.string,
}
OrderItemContainer.propTypes = {
    updatedAt: PropTypes.string,
    orderStatus: PropTypes.string,
    statusUpdatedBy: PropTypes.string,
    owner: PropTypes.string,
    ownerUpdatedBy: PropTypes.string,
    notes: PropTypes.string,
    notesUpdatedBy: PropTypes.string,
}