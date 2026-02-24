import PropTypes from "prop-types";
import {ChevronUp, ChevronDown, CaretRight, CaretDown} from "@carbon/icons-react/next";
import {useState} from "react";
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
    const [isOpen, setIsOpen] = useState(true);
    const {updatedAt, orderStatus, statusUpdatedBy, owner, ownerUpdatedBy, notes, notesUpdatedBy} = props;
    return <div className="order-item-container">
        <div className="order-item-container-header" onClick={() => setIsOpen(!isOpen)}>
            <span className="order-item-container-icon">{isOpen ? <CaretDown/> : <CaretRight/>}</span>
            <span>{updatedAt}</span>
        </div>
        {isOpen && <div>
            <OrderItem updatedBy={statusUpdatedBy} name={"Status"} value={orderStatus}/>
            <OrderItem updatedBy={ownerUpdatedBy} name={"Owner"} value={owner}/>
            <OrderItem updatedBy={notesUpdatedBy} name={"Notes"} value={notes}/>
        </div>}
    </div>
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