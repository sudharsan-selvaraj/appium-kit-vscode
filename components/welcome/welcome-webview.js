(function () {
  const vscode = acquireVsCodeApi();
  const state = null; //vscode.getState();

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
    invalidAppiumExecutable: {
      id: 'appium-not-found',
    },
    appiumNotFound: {
      id: 'appium-not-found',
    },
    configureAppiumPath: {
      id: 'configure-appium-path',
      onUpdate: (data) => {
        if (!!data) {
          document.getElementById('appium-version').textContent = data.version;
          document.getElementById('appium-path').textContent = data.path;
        }
      },
    },
  };

  function hideAllSection() {
    Object.values(sections).forEach(
      (section) => (document.getElementById(section.id).style.display = 'none')
    );
  }

  function unHideSection(sectionId) {
    console.log('Unhiding section: ', sectionId);
    activeSection = sectionId;
    document.getElementById(sections[sectionId].id).style.display = 'block';
  }

  function initialize() {
    if (!!state) {
      if (typeof sections[state.section].onUpdate === 'function') {
        sections[state.section].onUpdate(state.data);
      }
      unHideSection(state.section);
    } else {
      vscode.postMessage({ type: 'ready' });
    }
  }

  window.addEventListener('message', (message) => {
    const event = message.data;
    switch (event.type) {
      case 'update_view':
        if (activeSection !== event.section) {
          hideAllSection();
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
    initialize();

    document
      .getElementById('refresh-button')
      .addEventListener('click', function () {
        vscode.postMessage({ type: 'refresh' });
      });

    document
      .getElementById('save-and-continue')
      .addEventListener('click', function () {
        const state = vscode.getState();
        if (state && state.data && state.section === 'configureAppiumPath') {
          vscode.setState(null);
          vscode.postMessage({
            type: 'save-appium-path',
            data: { path: state.data.path },
          });
        }
      });
  });
})();
