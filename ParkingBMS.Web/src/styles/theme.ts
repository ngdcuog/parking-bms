import { ThemeConfig } from 'antd';

export const carbonTheme: ThemeConfig = {
  token: {
    fontFamily: 'IBM Plex Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: 0, // Flat square geometry
    colorPrimary: '#0f62fe', // IBM Blue
    colorBgContainer: '#ffffff',
    colorText: '#161616',
    colorTextDescription: '#525252',
    colorBorder: '#e0e0e0',
    colorSuccess: '#24a148',
    colorWarning: '#f1c21b',
    colorError: '#da1e28',
    colorInfo: '#0f62fe',
    controlHeight: 40, // Height for button, inputs
  },
  components: {
    Button: {
      borderRadius: 0,
      paddingContentHorizontal: 16,
      colorPrimary: '#0f62fe',
      colorPrimaryHover: '#0050e6',
      colorPrimaryActive: '#002d9c',
      colorBgContainerDisabled: '#e0e0e0',
      colorTextDisabled: '#8c8c8c',
    },
    Input: {
      borderRadius: 0,
      colorBgContainer: '#f4f4f4', // surface-1 background
      colorBorder: 'transparent',
    },
    InputNumber: {
      borderRadius: 0,
      colorBgContainer: '#f4f4f4',
      colorBorder: 'transparent',
    },
    Select: {
      borderRadius: 0,
      colorBgContainer: '#f4f4f4',
    },
    Table: {
      borderRadius: 0,
      headerBg: '#f4f4f4',
      headerColor: '#161616',
      rowHoverBg: '#f4f4f4',
    },
    Tabs: {
      inkBarColor: '#0f62fe',
      itemSelectedColor: '#161616',
      itemColor: '#525252',
      itemHoverColor: '#161616',
      horizontalItemPadding: '12px 16px',
    },
    Menu: {
      borderRadius: 0,
      itemSelectedBg: '#f4f4f4',
      itemSelectedColor: '#0f62fe',
      itemColor: '#161616',
      itemHoverBg: '#f4f4f4',
    },
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#ffffff',
      siderBg: '#f4f4f4',
    },
    Modal: {
      borderRadiusLG: 0,
      headerBg: '#f4f4f4',
    },
    Dropdown: {
      borderRadiusLG: 0,
    }
  }
};
