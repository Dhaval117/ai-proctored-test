import { makeStyles, tokens } from '@fluentui/react-components'

export const useCommonStyles = makeStyles({
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
  },
  topToggle: {
    position: 'absolute',
    top: '20px',
    right: '20px',
  },
  wFull: {
    width: '100%',
  },
  linkNoUnderline: {
    textDecoration: 'none',
  },
  headerBox: {
    marginBottom: tokens.spacingVerticalL,
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
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalS,
  },
  subtext: {
    color: tokens.colorNeutralForeground2,
  },

  // Main card
  mainCard: {
    width: '100%',
    maxWidth: '600px',
    padding: tokens.spacingVerticalXL,
    borderRadius: tokens.borderRadiusXLarge,
    border: '1px solid tokens.colorNeutralStroke1',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
  fullWidthButton: {
    width: '100%',
    fontWeight: 500,
  }
})
