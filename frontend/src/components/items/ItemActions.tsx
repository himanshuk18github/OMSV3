import { useNavigate } from 'react-router-dom';

const ItemActions = () => {
  const navigate = useNavigate();

  // Navigate to Add Item page
  const handleAddItemClick = () => {
    navigate('/items/add');
  };

  // Navigate to Update Inventory page
  const handleUpdateInventoryClick = () => {
    navigate('/items/update-inventory');
  };

  return (
    <div className="item-actions">
      <button className="action-button" onClick={handleAddItemClick}>
        Add Item to Inventory
      </button>

      <button className="action-button" onClick={handleUpdateInventoryClick}>
        Update Inventory
      </button>

      <button className="action-button">
        View Closing Stocks
      </button>
    </div>
  );
};

export default ItemActions;