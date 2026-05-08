import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Card, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

function useTailwindDarkMode() {
  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

const ItemsPage: React.FC = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();

  const cardBg = isDark ? '#0f172a' : '#fff';
  const cardText = isDark ? '#fff' : '#353535';
  const mutedText = isDark ? '#bfc7d1' : '#666';
  const buttonColor = '#465fff';

  const cardStyles = {
    borderRadius: '12px',
    boxShadow: isDark
      ? '0 4px 10px rgba(30,40,80,0.18)'
      : '0 4px 6px rgba(0,0,0,0.06)',
    border: isDark ? '1px solid #232d46' : 'none',
    background: cardBg,
    color: cardText,
    transition: 'background 0.2s',
  };

  const handleAddItemClick = () => {
    navigate('/items/add');
  };

  const handleUpdateInventoryClick = () => {
    navigate('/items/update-inventory');
  };

  const handleViewInventoryLogsClick = () => {
    navigate('/items/logs');
  };

  const viewclosingstock = () => {
    navigate('/items/viewclosingstock');
  };

  const actionCards = [
    {
      title: 'Add Item',
      subtitle: 'Create New Product',
      icon: <AddBoxOutlinedIcon sx={{ fontSize: 40, color: buttonColor }} />,
      onClick: handleAddItemClick,
    },
    {
      title: 'Update Inventory',
      subtitle: 'Adjust Product Stock',
      icon: <SyncAltOutlinedIcon sx={{ fontSize: 40, color: buttonColor }} />,
      onClick: handleUpdateInventoryClick,
    },
    {
      title: 'Closing Stock',
      subtitle: 'View Closing Report',
      icon: <Inventory2OutlinedIcon sx={{ fontSize: 40, color: buttonColor }} />,
      onClick: viewclosingstock,
    },
    {
      title: 'Inventory Logs',
      subtitle: 'View Update History',
      icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: buttonColor }} />,
      onClick: handleViewInventoryLogsClick,
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 0, md: 1 },
        minHeight: 'auto',
        bgcolor: 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          component="h1"
          className="app-page-title"
          sx={{
            color: cardText,
            fontWeight: 800,
            fontSize: "30px",
            lineHeight: "38px",
          }}
        >
          Product Inventory Management
        </Typography>
      </Box>

      <Grid
        container
        spacing={3}
        columnSpacing={3}
        rowSpacing={3}
        alignItems="stretch"
        sx={{ maxWidth: 1320 }}
      >
        {actionCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.title}>
            <Card
              sx={{
                width: '100%',
                maxWidth: 320,
                minHeight: 220,
                mb: 0,
                p: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                ...cardStyles,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isDark
                    ? '0 6px 18px rgba(70,95,255,0.25)'
                    : '0 6px 12px rgba(0,0,0,0.08)',
                  background: isDark ? '#232d46' : '#f5f7fb',
                },
              }}
              onClick={card.onClick}
            >
              {card.icon}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  textAlign: 'center',
                  color: cardText,
                  fontSize: '15px',
                }}
              >
                {card.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: mutedText,
                  fontSize: '13px',
                }}
              >
                {card.subtitle}
              </Typography>
              <Box
                component="button"
                sx={{
                  mt: 2,
                  bgcolor: buttonColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  px: 3,
                  py: 0.7,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background 0.2s',
                  '&:hover': {
                    bgcolor: '#2840c0',
                  },
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  card.onClick();
                }}
              >
                Go
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ItemsPage;