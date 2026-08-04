import { makeStyles, tokens } from '@fluentui/react-components'

export const useAdminStyles = makeStyles({
  mainWrapper: {
    width: '100%',
    maxWidth: '1280px',
    margin: '5px auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  headerIconBox: {
    width: '52px',
    height: '52px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    display: 'block',
    fontWeight: 800,
  },
  headerSubtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
  refreshBtn: {
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  filterCard: {
    padding: '16px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  filterForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: '16px',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    },
  },
  errorAlert: {
    padding: '14px 18px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorPaletteRedBackground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    color: tokens.colorPaletteRedForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  retryBtn: {
    textDecoration: 'underline',
  },
  tableCard: {
    padding: '0px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tableContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'auto',
  },
  tableHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  tableHeaderCell: {
    fontWeight: 700,
    padding: '14px 16px',
  },
  tableHeaderCellCandidate: {
    fontWeight: 700,
    padding: '14px 16px',
    width: '25%',
  },
  tableHeaderCellLanguage: {
    fontWeight: 700,
    padding: '14px 16px',
    width: '20%',
  },
  tableHeaderCellCompact: {
    fontWeight: 700,
    padding: '14px 16px',
    width: '15%',
  },
  tableHeaderCellActions: {
    fontWeight: 700,
    padding: '14px 16px',
    textAlign: 'right',
    width: '15%',
  },
  tableCellEmpty: {
    padding: '64px',
    textAlign: 'center',
  },
  tableRow: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  tableCellCandidate: {
    padding: '16px 20px',
  },
  candidateNameText: {
    display: 'block',
    fontWeight: 600,
  },
  candidateEmailText: {
    display: 'block',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  tableCell: {
    padding: '16px',
  },
  languageText: {
    display: 'block',
    fontWeight: 600,
    color: tokens.colorBrandForeground1,
  },
  expText: {
    display: 'block',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  violationsCell: {
    padding: '16px',
    fontFamily: 'var(--font-mono)',
  },
  violationsHighlight: {
    fontWeight: 700,
    color: tokens.colorPaletteYellowForeground1,
  },
  violationsNormal: {
    fontWeight: 400,
    color: tokens.colorNeutralForeground3,
  },
  violationsMax: {
    color: tokens.colorNeutralForeground4,
  },
  dateCell: {
    padding: '16px',
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  actionBtn: {
    fontWeight: 600,
  },
  paginationFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  paginationText: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  paginationStrong: {
    color: tokens.colorNeutralForeground1,
  },
  pageIndicator: {
    fontWeight: 600,
  },
  iconMd: {
    width: '28px',
    height: '28px',
  },
})
