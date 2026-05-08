import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

type InvoiceItem = {
  serial: number;
  productName: string;
  skuFixed: string;
  skuScanned: string;
  hsnSac: string;
  gstRate: number;
  quantity: number;
  mrp: number;
  rate: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  netAmount: number;
};

type TaxSummaryRow = {
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
};

type InvoiceDocumentProps = {
  companyLogo: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyGst: string;
  invoiceNumber: string;
  invoiceDate: string;
  modeOfPayment: string;
  buyerName: string;
  buyerAdd: string;
  buyerState: string;
  buyerContact: string;
  buyerGst: string;
  additionalDetails: string;
  salesChannel: string;
  items: InvoiceItem[];
  taxSummaryRows: TaxSummaryRow[];
  actualTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalGst: number;
  roundedTotal: number;
  amountInWords: string;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica', lineHeight: 1.35, color: '#172b4d', backgroundColor: '#f5f8ff' },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#0b1f4d',
    letterSpacing: 0.6,
  },
  headingAccent: {
    width: 96,
    height: 2,
    backgroundColor: '#2d6cdf',
    alignSelf: 'center',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    border: '1 solid #d4e0f5',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 5,
    boxShadow: '0 2 6 rgba(15, 23, 42, 0.08)',
  },
  leftCol: { width: '62%' },
  rightCol: { width: '36%', borderLeft: '1 solid #e4ecfa', paddingLeft: 10 },
  companyName: { fontSize: 13, fontWeight: 'bold', color: '#1f4ba5', marginTop: 2 },
  small: { fontSize: 8, color: '#334155', marginBottom: 1 },
  label: { fontWeight: 'bold' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 3, marginTop: 0, color: '#1e40af' },
  sectionBox: {
    border: '1 solid #dce6f8',
    backgroundColor: '#ffffff',
    padding: 9,
    borderRadius: 5,
    marginBottom: 12,
  },
  buyerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  buyerCol: {
    width: '50%',
    marginBottom: 2,
  },
  sectionCaption: {
    fontSize: 8,
    color: '#5b6f93',
  },
  tableHeader: {
    flexDirection: 'row',
    borderTop: '1 solid #b9c7e7',
    borderBottom: '1 solid #b9c7e7',
    backgroundColor: '#dde8fb',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e6ecf9',
    paddingVertical: 4,
  },
  tableRowAlt: {
    backgroundColor: '#f9fbff',
  },
  cSi: { width: 20, textAlign: 'center' },
  cProduct: { width: 90, paddingHorizontal: 2 },
  cSku: { width: 62, paddingHorizontal: 2 },
  cHsn: { width: 45, textAlign: 'center' },
  cRate: { width: 36, textAlign: 'right', paddingRight: 2 },
  cQty: { width: 28, textAlign: 'center' },
  cMoney: { width: 52, textAlign: 'right', paddingRight: 2 },
  contentBottom: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  taxPanel: {
    width: '48%',
    border: '1 solid #dce6f8',
    backgroundColor: '#ffffff',
    borderRadius: 5,
    padding: 8,
  },
  totalsPanel: {
    width: '48%',
    border: '1 solid #dce6f8',
    backgroundColor: '#ffffff',
    borderRadius: 5,
    padding: 8,
  },
  totalsWrap: { alignItems: 'flex-end' },
  totalRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalStrong: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1 solid #b9c2cf',
    paddingTop: 4,
    marginTop: 3,
    fontWeight: 'bold',
    color: '#0b1f4d',
  },
  taxTitle: { marginBottom: 4, fontWeight: 'bold', color: '#1e40af' },
  taxHeader: {
    flexDirection: 'row',
    borderTop: '1 solid #cfdaef',
    borderBottom: '1 solid #cfdaef',
    backgroundColor: '#eef3fc',
    paddingVertical: 2,
  },
  taxRow: { flexDirection: 'row', borderBottom: '1 solid #eceff5', paddingVertical: 2 },
  taxCol1: { width: 80, textAlign: 'center' },
  taxCol2: { width: 110, textAlign: 'right', paddingRight: 6 },
  taxCol3: { width: 110, textAlign: 'right', paddingRight: 6 },
  amountWords: {
    marginTop: 12,
    borderTop: '1 solid #dce6f8',
    borderBottom: '1 solid #dce6f8',
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 6,
    fontStyle: 'italic',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  signature: { marginTop: 14, textAlign: 'right', fontWeight: 'bold', color: '#0b1f4d' },
  declarationWrap: {
    marginTop: 14,
    borderTop: '1 solid #d6deeb',
    paddingTop: 8,
    alignItems: 'center',
  },
  declarationLine: {
    textAlign: 'center',
    fontSize: 9,
    color: '#0f172a',
    marginBottom: 2,
  },
});

const money = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`;

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  companyLogo,
  companyName,
  companyAddress,
  companyEmail,
  companyGst,
  invoiceNumber,
  invoiceDate,
  modeOfPayment,
  buyerName,
  buyerAdd,
  buyerState,
  buyerContact,
  buyerGst,
  additionalDetails,
  salesChannel,
  items,
  taxSummaryRows,
  actualTotal,
  totalDiscount,
  totalTaxable,
  totalGst,
  roundedTotal,
  amountInWords,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>TAX INVOICE</Text>
        <View style={styles.headingAccent} />

        <View style={styles.topRow}>
          <View style={styles.leftCol}>
            <Image src={companyLogo} style={{ width: 90, height: 30, marginBottom: 2 }} />
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.small}>{companyAddress}</Text>
            <Text style={styles.small}>Email: {companyEmail}</Text>
            <Text style={styles.small}>GSTIN: {companyGst}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text><Text style={styles.label}>Invoice No:</Text> {invoiceNumber}</Text>
            <Text><Text style={styles.label}>Date:</Text> {invoiceDate}</Text>
            <Text><Text style={styles.label}>Payment:</Text> {modeOfPayment}</Text>
            <Text><Text style={styles.label}>Sales Channel:</Text> {salesChannel}</Text>
          </View>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Buyer Details</Text>
          <View style={styles.buyerGrid}>
            <View style={styles.buyerCol}>
              <Text style={styles.sectionCaption}>Buyer Name</Text>
              <Text>{buyerName}</Text>
            </View>
            <View style={styles.buyerCol}>
              <Text style={styles.sectionCaption}>Contact</Text>
              <Text>{buyerContact}</Text>
            </View>
            <View style={styles.buyerCol}>
              <Text style={styles.sectionCaption}>State</Text>
              <Text>{buyerState}</Text>
            </View>
            <View style={styles.buyerCol}>
              <Text style={styles.sectionCaption}>GSTIN</Text>
              <Text>{buyerGst || '-'}</Text>
            </View>
            <View style={{ width: '100%', marginBottom: 2 }}>
              <Text style={styles.sectionCaption}>Address</Text>
              <Text>{buyerAdd || '-'}</Text>
            </View>
            <View style={{ width: '100%' }}>
              <Text style={styles.sectionCaption}>Additional Details</Text>
              <Text>{additionalDetails || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cSi}>SI</Text>
          <Text style={styles.cProduct}>Product</Text>
          <Text style={styles.cSku}>SKU</Text>
          <Text style={styles.cHsn}>HSN</Text>
          <Text style={styles.cRate}>GST%</Text>
          <Text style={styles.cMoney}>MRP</Text>
          <Text style={styles.cMoney}>Rate</Text>
          <Text style={styles.cMoney}>Disc</Text>
          <Text style={styles.cMoney}>Taxable</Text>
          <Text style={styles.cMoney}>GST</Text>
          <Text style={styles.cMoney}>Net</Text>
        </View>
        {items.map((item, idx) => (
          <View style={idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow} key={item.serial}>
            <Text style={styles.cSi}>{item.serial}</Text>
            <Text style={styles.cProduct}>{item.productName}</Text>
            <Text style={styles.cSku}>{item.skuScanned}</Text>
            <Text style={styles.cHsn}>{item.hsnSac || '-'}</Text>
            <Text style={styles.cRate}>{item.gstRate}%</Text>
            <Text style={styles.cMoney}>{money(item.mrp)}</Text>
            <Text style={styles.cMoney}>{money(item.rate)}</Text>
            <Text style={styles.cMoney}>{money(item.discountAmount)}</Text>
            <Text style={styles.cMoney}>{money(item.taxableAmount)}</Text>
            <Text style={styles.cMoney}>{money(item.gstAmount)}</Text>
            <Text style={styles.cMoney}>{money(item.netAmount)}</Text>
          </View>
        ))}

        <View style={styles.contentBottom}>
          <View style={styles.taxPanel}>
            <Text style={styles.taxTitle}>Tax Summary</Text>
            <View style={styles.taxHeader}>
              <Text style={styles.taxCol1}>GST Rate</Text>
              <Text style={styles.taxCol2}>Taxable Amount</Text>
              <Text style={styles.taxCol3}>GST Amount</Text>
            </View>
            {taxSummaryRows.map((row) => (
              <View style={styles.taxRow} key={row.gstRate}>
                <Text style={styles.taxCol1}>{row.gstRate}%</Text>
                <Text style={styles.taxCol2}>{money(row.taxableAmount)}</Text>
                <Text style={styles.taxCol3}>{money(row.gstAmount)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsPanel}>
            <Text style={styles.taxTitle}>Invoice Totals</Text>
            <View style={styles.totalsWrap}>
              <View style={styles.totalRow}><Text>Actual Total:</Text><Text>{money(actualTotal)}</Text></View>
              <View style={styles.totalRow}><Text>Total Discount:</Text><Text>{money(totalDiscount)}</Text></View>
              <View style={styles.totalRow}><Text>Total Taxable:</Text><Text>{money(totalTaxable)}</Text></View>
              <View style={styles.totalRow}><Text>Total GST:</Text><Text>{money(totalGst)}</Text></View>
              <View style={styles.totalStrong}><Text>Total Bill Amount (Rounded):</Text><Text>{money(roundedTotal)}</Text></View>
            </View>
          </View>
        </View>

        <Text style={styles.amountWords}>Amount in words: {amountInWords}</Text>

        <View style={styles.declarationWrap}>
          <Text style={styles.declarationLine}>Declaration: THIS IS COMPUTER GENERATED INVOICE DOES NOT REQUIRE ANY SIGNATURE.</Text>
          <Text style={styles.declarationLine}>THANKS FOR SHOPPING WITH APNI STATIONERY.</Text>
        </View>

        <View style={styles.signature}>
          <Text>For APNI STATIONERY</Text>
          <Text>Authorised Signatory</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;
