import { makeStyles, shorthands, tokens } from '@fluentui/react-components'

export const useAdminStyles = makeStyles({
  pageContainer: {
    minHeight: '100dvh',
    ...shorthands.padding('24px'),
    '@media (min-width: 768px)': {
      ...shorthands.padding('40px'),
    },
    position: 'relative',
  },
  topToggle: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    zIndex: 10,
  },
  mainWrapper: {
    maxWidth: '1280px',
    ...shorthands.margin('0px', 'auto'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px'),
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  headerIconBox: {
    width: '52px',
    height: '52px',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
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
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  filterForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    ...shorthands.gap('16px'),
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    },
  },
  wFull: {
    width: '100%',
  },
  errorAlert: {
    ...shorthands.padding('14px', '18px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorPaletteRedBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedBorder1),
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
    ...shorthands.padding('0px'),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tableHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  tableHeaderCell: {
    fontWeight: 700,
    ...shorthands.padding('14px', '16px'),
  },
  tableHeaderCellCandidate: {
    fontWeight: 700,
    ...shorthands.padding('14px', '20px'),
  },
  tableHeaderCellActions: {
    fontWeight: 700,
    ...shorthands.padding('14px', '20px'),
    textAlign: 'right',
  },
  tableCellEmpty: {
    ...shorthands.padding('64px'),
    textAlign: 'center',
  },
  tableRow: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  tableCellCandidate: {
    ...shorthands.padding('16px', '20px'),
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
  },
  tableCell: {
    ...shorthands.padding('16px'),
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
    ...shorthands.padding('16px'),
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
    ...shorthands.padding('16px'),
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  actionsCell: {
    ...shorthands.padding('16px', '20px'),
    textAlign: 'right',
  },
  linkNoUnderline: {
    textDecoration: 'none',
  },
  actionBtn: {
    fontWeight: 600,
  },
  paginationFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('16px', '20px'),
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
