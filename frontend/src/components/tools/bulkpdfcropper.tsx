import { useEffect } from 'react';

const BulkPdfCropper = () => {
  useEffect(() => {
    // Open SmallPDF in a new tab
    window.open('https://smallpdf.com/crop-pdf#r=crop-pages', '_blank');
    
    // Redirect current tab to your tools page
    window.location.replace('/tools');
  }, []);

  return null;
};

export default BulkPdfCropper;
