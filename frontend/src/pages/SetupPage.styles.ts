import { makeStyles, shorthands, tokens } from '@fluentui/react-components'

export const useSetupStyles = makeStyles({
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL
  },
  topToggle: {
    position: 'absolute',
    top: '20px',
    right: '20px',
  },
  headerBox: {
    marginBottom: tokens.spacingVerticalL,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalS,
  },
  logoIconBox: {
    display: 'flex',
    height: '48px',
    width: '48px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius2XLarge,
    backgroundColor: tokens.colorBrandBackground,
  },
  logoIcon: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  subtext: {
    color: tokens.colorNeutralForeground2,
  },
  mainCard: {
    width: '100%',
    maxWidth: '600px',
    padding: tokens.spacingVerticalXL,
    borderRadius: tokens.borderRadiusXLarge,
    border: '1px solid tokens.colorNeutralStroke1',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
  cardHeaderBox: {
    marginBottom: tokens.spacingVerticalXXS,
  },
  cardTitle: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXXS,
  },
  cardSubtitle: {
    color: tokens.colorNeutralForeground3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  fieldLabelSpan: {
    display: 'contents',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontWeight: 500,
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  expGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  expBtn: {
    borderRadius: tokens.borderRadiusMedium,
    fontWeight: 500,
  },
  expBtnActive: {
    fontWeight: 600,
  },
  submitContainer: {
    paddingTop: tokens.spacingVerticalS,
  },
  submitBtn: {
    width: '100%',
    fontWeight: 500,
  },
  tooltipTrigger: {
    display: 'block',
    width: '100%',
  },
  footerNote: {
    marginTop: '16px',
    color: tokens.colorNeutralForeground4,
  },
})
