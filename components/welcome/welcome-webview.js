(function () {
  const vscode = acquireVsCodeApi();
  const state = vscode.getState();

  let activeSection = null;
  const sections = {
    loading: {
      id: 'loading',
      onUpdate: (data) => {
        if (data && data.message) {
          document.getElementById('loader-message').textContent = data.message;
        }
      },
    },
    appiumVersionNotSupported: {
      id: 'appium-version-not-supported',
      onUpdate: (data) => {
        if (data) {
          const source =
            data.source === 'settings'
              ? 'configurated in the settings'
              : 'installed on the machine';
          document.getElementById('appium-source').textContent = source;
          document.getElementById('appium-path').textContent =
            data.path || 'unknown';
          document.getElementById('required-appium-version').textContent =
            data.requiredVersion;
          document.getElementById('actual-appium-version').textContent =
            data.version || 'unknown';
        }
      },
    },
    appiumNotFound: {
      id: 'appium-not-found',
    },
  };

  function hideAllSections() {
    Object.values(sections).forEach(
      (section) => (document.getElementById(section.id).style.display = 'none')
    );
  }

  function unHideSection(sectionId) {
    activeSection = sectionId;
    document.getElementById(sections[sectionId].id).style.display = 'flex';
  }

  function initialize() {
    if (!!state && !!state.section) {
      hideAllSections();
      if (typeof sections[state.section].onUpdate === 'function') {
        sections[state.section].onUpdate(state.data);
      }
      unHideSection(state.section);
    }
    vscode.postMessage({ type: 'ready' });
  }

  window.addEventListener('message', (message) => {
    const event = message.data;
    switch (event.type) {
      case 'update_view':
        if (activeSection !== event.section) {
          hideAllSections();
        }
        if (typeof sections[event.section].onUpdate === 'function') {
          sections[event.section].onUpdate(event.data);
        }
        unHideSection(event.section);
        vscode.setState({
          section: event.section,
          data: event.data,
        });
        break;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    Array.from(document.getElementsByClassName('refresh-button')).forEach(
      (ele) => {
        ele.addEventListener('click', function () {
          vscode.postMessage({ type: 'refresh' });
        });
      }
    );

    document.getElementById('open-settings').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });
  });

  initialize();
})();
