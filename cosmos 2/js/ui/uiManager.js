/**
 * COSMOS X — UI Manager
 * Manages all UI components: inspector, search, labels, context menu, panels
 */

export class UIManager {
  constructor(cosmos) {
    this.cosmos = cosmos;
    this.selectedBody = null;
    this.labelsVisible = true;
    this.orbitLinesVisible = true;
    this.labels = new Map();

    this._initElements();
    this._bindEvents();
    this._initObjectList();
    this._initSatelliteList();
  }

  _initElements() {
    // Top bar
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.btnPause = document.getElementById('btn-pause');
    this.btnPlay = document.getElementById('btn-play');
    this.btnReverse = document.getElementById('btn-reverse');
    this.speedBtns = document.querySelectorAll('.speed-btn');
    this.btnSave = document.getElementById('btn-save');
    this.btnLoad = document.getElementById('btn-load');
    this.btnScreenshot = document.getElementById('btn-screenshot');
    this.btnSettings = document.getElementById('btn-settings');
    this.settingsModal = document.getElementById('settings-modal');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
    this.settingSubsteps = document.getElementById('setting-substeps');

    // Inspector
    this.rightPanel = document.getElementById('right-panel');
    this.inspectorTitle = document.getElementById('inspector-title');
    this.inspectorBody = document.getElementById('inspector-body');
    this.inspectorActions = document.getElementById('inspector-actions');
    this.inspectorClose = document.getElementById('inspector-close');

    // Bottom bar
    this.simDate = document.getElementById('sim-date');
    this.simSpeedDisplay = document.getElementById('sim-speed-display');
    this.fpsDisplay = document.getElementById('fps-display');
    this.bodyCount = document.getElementById('body-count');
    this.cameraDistance = document.getElementById('camera-distance');
    this.timelineThumb = document.getElementById('timeline-thumb');

    // Left panel
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.subPanels = document.querySelectorAll('.sub-panel');
    this.objectList = document.getElementById('object-list');
    this.satelliteList = document.getElementById('satellite-list');

    // Context menu
    this.contextMenu = document.getElementById('context-menu');

    // Effects toggles
    this.toggleOrbits = document.getElementById('toggle-orbits');
    this.toggleBloom = document.getElementById('toggle-bloom');
    this.toggleAtmosphere = document.getElementById('toggle-atmosphere');
    this.toggleLabels = document.getElementById('toggle-labels');
    this.toggleGrid = document.getElementById('toggle-grid');

    // Spawn buttons
    this.spawnBtns = document.querySelectorAll('.spawn-btn');

    // Galaxy controls
    this.galaxyStarsRange = document.getElementById('galaxy-stars');
    this.galaxyArmsRange = document.getElementById('galaxy-arms');
    this.galaxyRadiusRange = document.getElementById('galaxy-radius');
    this.galaxyStarsVal = document.getElementById('galaxy-stars-val');
    this.galaxyArmsVal = document.getElementById('galaxy-arms-val');
    this.galaxyRadiusVal = document.getElementById('galaxy-radius-val');
    this.galaxyType = document.getElementById('galaxy-type');
    this.btnGenerateGalaxy = document.getElementById('btn-generate-galaxy');

    // Effects buttons
    this.btnSupernova = document.getElementById('btn-supernova');
    this.btnBlackholeConvert = document.getElementById('btn-blackhole-convert');
    this.btnAsteroidStorm = document.getElementById('btn-asteroid-storm');
    this.btnCometShower = document.getElementById('btn-comet-shower');
    this.btnResetOrbits = document.getElementById('btn-reset-orbits');
    this.btnDestroyPlanet = document.getElementById('btn-destroy-planet');

    // Labels container
    this.labelsContainer = document.getElementById('labels-container');

    // Toast container
    this.toastContainer = document.getElementById('toast-container');
  }

  _bindEvents() {
    // Search
    this.searchInput.addEventListener('input', () => this._onSearch());
    this.searchInput.addEventListener('focus', () => this._onSearch());
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.searchResults.classList.add('hidden');
      }
      if (!e.target.closest('#context-menu') && !e.target.closest('#cosmos-canvas')) {
        this.hideContextMenu();
      }
    });

    // Time controls
    this.btnPause.addEventListener('click', () => this.cosmos.togglePause());
    this.btnPlay.addEventListener('click', () => this.cosmos.setPlaying(true));
    this.btnReverse.addEventListener('click', () => {
      this.cosmos.physics.timeScale *= -1;
      this.cosmos.showToast('Time reversed', 'info');
    });

    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.cosmos.setTimeScale(speed);
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Save/Load/Settings
    this.btnSave.addEventListener('click', () => this.cosmos.saveUniverse());
    this.btnLoad.addEventListener('click', () => this.cosmos.loadUniverse());
    this.btnScreenshot.addEventListener('click', () => this.cosmos.takeScreenshot());
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      });
    }
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }
    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }
    if (this.settingSubsteps) {
      this.settingSubsteps.addEventListener('change', () => {
        const val = parseInt(this.settingSubsteps.value, 10);
        if (this.cosmos.physics) this.cosmos.physics.substeps = val;
        this.showToast(`Physics accuracy: ${val} substeps`, 'info');
      });
    }

    // Inspector close
    this.inspectorClose.addEventListener('click', () => this.closeInspector());

    // Nav panel switching
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const panelId = 'panel-' + btn.dataset.panel;
        this.subPanels.forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('hidden');
      });
    });

    // Satellite filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._filterSatellites(btn.dataset.filter);
      });
    });

    // Toggles
    this.toggleOrbits.addEventListener('change', () => {
      this.orbitLinesVisible = this.toggleOrbits.checked;
      this.cosmos.setOrbitLinesVisible(this.orbitLinesVisible);
    });

    this.toggleBloom.addEventListener('change', () => {
      this.cosmos.renderer.setBloom(this.toggleBloom.checked);
    });

    this.toggleAtmosphere.addEventListener('change', () => {
      this.cosmos.setAtmosphereVisible(this.toggleAtmosphere.checked);
    });

    this.toggleLabels.addEventListener('change', () => {
      this.labelsVisible = this.toggleLabels.checked;
      this.labelsContainer.style.display = this.labelsVisible ? 'block' : 'none';
    });

    this.toggleGrid.addEventListener('change', () => {
      this.cosmos.toggleGrid(this.toggleGrid.checked);
    });

    // Spawn buttons
    this.spawnBtns.forEach(btn => {
      btn.addEventListener('click', () => this.cosmos.spawnObject(btn.dataset.type));
    });

    // Galaxy generation
    this.galaxyStarsRange.addEventListener('input', () => {
      this.galaxyStarsVal.textContent = parseInt(this.galaxyStarsRange.value).toLocaleString();
    });
    this.galaxyArmsRange.addEventListener('input', () => {
      this.galaxyArmsVal.textContent = this.galaxyArmsRange.value;
    });
    this.galaxyRadiusRange.addEventListener('input', () => {
      this.galaxyRadiusVal.textContent = this.galaxyRadiusRange.value;
    });
    this.btnGenerateGalaxy.addEventListener('click', () => {
      this.cosmos.generateGalaxy({
        type: this.galaxyType.value,
        starCount: parseInt(this.galaxyStarsRange.value),
        arms: parseInt(this.galaxyArmsRange.value),
        radius: parseFloat(this.galaxyRadiusRange.value),
      });
    });

    // Effects panel
    this.btnSupernova.addEventListener('click', () => {
      if (this.selectedBody) {
        this.cosmos.triggerSupernova(this.selectedBody);
      } else {
        this.cosmos.showToast('Select a star first', 'info');
      }
    });

    this.btnBlackholeConvert.addEventListener('click', () => {
      if (this.selectedBody) {
        this.cosmos.convertToBlackHole(this.selectedBody);
      } else {
        this.cosmos.showToast('Select a star first', 'info');
      }
    });

    this.btnAsteroidStorm.addEventListener('click', () => this.cosmos.triggerAsteroidStorm());
    this.btnCometShower.addEventListener('click', () => this.cosmos.triggerCometShower());
    this.btnResetOrbits.addEventListener('click', () => this.cosmos.resetOrbits());
    this.btnDestroyPlanet.addEventListener('click', () => {
      if (this.selectedBody) {
        this.cosmos.destroyPlanet(this.selectedBody);
      } else {
        this.cosmos.showToast('Select a planet first', 'info');
      }
    });

    // Context menu items
    document.getElementById('ctx-focus').addEventListener('click', () => {
      if (this.selectedBody) this.cosmos.focusBody(this.selectedBody);
      this.hideContextMenu();
    });
    document.getElementById('ctx-inspect').addEventListener('click', () => {
      if (this.selectedBody) this.showInspector(this.selectedBody);
      this.hideContextMenu();
    });
    document.getElementById('ctx-edit').addEventListener('click', () => {
      if (this.selectedBody) this.showInspector(this.selectedBody, true);
      this.hideContextMenu();
    });
    document.getElementById('ctx-delete').addEventListener('click', () => {
      if (this.selectedBody) this.cosmos.deleteBody(this.selectedBody);
      this.hideContextMenu();
    });
    document.getElementById('ctx-destroy').addEventListener('click', () => {
      if (this.selectedBody) this.cosmos.destroyPlanet(this.selectedBody);
      this.hideContextMenu();
    });
  }

  // =============================================
  // OBJECT LIST
  // =============================================
  _initObjectList() {
    if (!this.cosmos.orbitalBodies) return;
    this.updateObjectList();
  }

  updateObjectList() {
    if (!this.objectList || !this.cosmos.orbitalBodies) return;
    this.objectList.innerHTML = '';

    const bodies = Array.from(this.cosmos.orbitalBodies.values());

    // Group by type
    const stars = bodies.filter(b => b.data.type === 'star');
    const planets = bodies.filter(b => b.data.type === 'planet');
    const moons = bodies.filter(b => b.data.type === 'moon');
    const dwarfs = bodies.filter(b => b.data.type === 'dwarf-planet');

    const addGroup = (title, items) => {
      if (items.length === 0) return;
      const header = document.createElement('div');
      header.className = 'panel-title';
      header.textContent = title;
      this.objectList.appendChild(header);
      items.forEach(body => this._addObjectItem(body));
    };

    addGroup('Stars', stars);
    addGroup('Planets', planets);
    addGroup('Dwarf Planets', dwarfs);
    addGroup('Moons', moons);
  }

  _addObjectItem(body) {
    const item = document.createElement('div');
    item.className = 'obj-item';
    item.dataset.id = body.id;

    const iconEl = document.createElement('span');
    iconEl.className = 'obj-icon';
    iconEl.textContent = body.data.icon || '⚫';

    const infoEl = document.createElement('div');
    infoEl.className = 'obj-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'obj-name';
    nameEl.textContent = body.data.name;

    const typeEl = document.createElement('div');
    typeEl.className = 'obj-type';
    typeEl.textContent = this._formatType(body.data.type);

    infoEl.appendChild(nameEl);
    infoEl.appendChild(typeEl);
    item.appendChild(iconEl);
    item.appendChild(infoEl);

    item.addEventListener('click', () => {
      this.cosmos.selectBody(body.id);
    });

    this.objectList.appendChild(item);
  }

  _formatType(type) {
    const types = {
      'star': 'Star',
      'planet': 'Planet',
      'moon': 'Moon',
      'dwarf-planet': 'Dwarf Planet',
      'asteroid': 'Asteroid',
      'comet': 'Comet',
      'satellite': 'Satellite',
      'black-hole': 'Black Hole',
    };
    return types[type] || type;
  }

  // =============================================
  // SATELLITE LIST
  // =============================================
  _initSatelliteList() {
    if (!this.cosmos.satellites) return;
    this.updateSatelliteList();
  }

  updateSatelliteList(filter = 'all') {
    if (!this.satelliteList) return;
    this.satelliteList.innerHTML = '';

    if (!this.cosmos.satellites) return;

    let sats = Array.from(this.cosmos.satellites.values());
    if (filter !== 'all') {
      sats = sats.filter(s => s.data.status === filter);
    }

    sats.forEach(sat => {
      const item = document.createElement('div');
      item.className = 'obj-item';

      const iconEl = document.createElement('span');
      iconEl.className = 'obj-icon';
      iconEl.textContent = sat.data.icon || '🛰️';

      const infoEl = document.createElement('div');
      infoEl.className = 'obj-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'obj-name';
      nameEl.textContent = sat.data.name;

      const typeEl = document.createElement('div');
      typeEl.className = 'obj-type';
      typeEl.textContent = sat.data.type + ' · ' + sat.data.status;

      infoEl.appendChild(nameEl);
      infoEl.appendChild(typeEl);
      item.appendChild(iconEl);
      item.appendChild(infoEl);

      item.addEventListener('click', () => {
        this.cosmos.selectBody(sat.id || 'satellite_' + sat.data.id);
      });

      this.satelliteList.appendChild(item);
    });
  }

  _filterSatellites(filter) {
    this.updateSatelliteList(filter);
  }

  // =============================================
  // SEARCH
  // =============================================
  _onSearch() {
    const query = this.searchInput.value.trim().toLowerCase();
    this.searchResults.innerHTML = '';

    if (!query) {
      this.searchResults.classList.add('hidden');
      return;
    }

    const allBodies = this.cosmos.getSearchableObjects();
    const results = allBodies.filter(obj =>
      obj.name.toLowerCase().includes(query) ||
      (obj.type && obj.type.toLowerCase().includes(query))
    ).slice(0, 10);

    if (results.length === 0) {
      this.searchResults.classList.add('hidden');
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-item';

      const icon = document.createElement('span');
      icon.className = 'search-item-icon';
      icon.textContent = result.icon || '⚫';

      const info = document.createElement('div');
      info.className = 'search-item-info';

      const name = document.createElement('div');
      name.className = 'search-item-name';
      name.textContent = result.name;

      const type = document.createElement('div');
      type.className = 'search-item-type';
      type.textContent = this._formatType(result.type);

      info.appendChild(name);
      info.appendChild(type);
      item.appendChild(icon);
      item.appendChild(info);

      item.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchResults.classList.add('hidden');
        this.cosmos.selectAndFocusById(result.id);
      });

      this.searchResults.appendChild(item);
    });

    this.searchResults.classList.remove('hidden');
  }

  // =============================================
  // INSPECTOR
  // =============================================
  showInspector(bodyData, editMode = false) {
    this.selectedBody = bodyData;
    this.rightPanel.classList.remove('hidden');
    this.inspectorTitle.textContent = bodyData.name || 'Unknown Object';

    this.inspectorBody.innerHTML = '';
    this.inspectorActions.innerHTML = '';

    const data = bodyData.data || bodyData;
    const type = data.type || bodyData.type;

    if (type === 'satellite' || data.operator) {
      this._buildSatelliteInspector(data, editMode);
    } else if (type === 'black-hole') {
      this._buildBlackHoleInspector(data, editMode);
    } else if (type === 'star') {
      this._buildStarInspector(data, editMode);
    } else {
      this._buildPlanetInspector(data, editMode);
    }

    this._buildInspectorActions(bodyData);
  }

  _buildPlanetInspector(data, editMode) {
    const sections = [
      {
        title: 'Physical Properties',
        rows: [
          ['Mass', this._formatMass(data.mass)],
          ['Radius', this._formatRadius(data.radius)],
          ['Density', data.density ? data.density.toFixed(0) + ' kg/m³' : '—'],
          ['Surface Gravity', data.gravity ? data.gravity.toFixed(2) + ' m/s²' : '—'],
          ['Temperature', data.temperature ? data.temperature.toFixed(0) + ' K' : '—'],
        ],
      },
      {
        title: 'Orbital Elements',
        rows: [
          ['Semi-Major Axis', data.semiMajorAxis ? this._formatDistance(data.semiMajorAxis) : '—'],
          ['Eccentricity', data.eccentricity != null ? data.eccentricity.toFixed(4) : '—'],
          ['Inclination', data.inclination != null ? data.inclination.toFixed(2) + '°' : '—'],
          ['Orbital Period', data.orbitalPeriod ? this._formatPeriod(data.orbitalPeriod) : '—'],
          ['Orbital Velocity', data.velocity ? data.velocity.toFixed(2) + ' km/s' : '—'],
        ],
      },
      {
        title: 'Rotation',
        rows: [
          ['Day Length', data.dayLength ? data.dayLength.toFixed(1) + ' hours' : '—'],
          ['Rotation Period', data.rotationPeriod ? data.rotationPeriod.toFixed(3) + ' days' : '—'],
        ],
      },
    ];

    if (data.atmosphere) {
      sections.push({
        title: 'Atmosphere',
        rows: [['Composition', data.atmosphere]],
      });
    }

    this._renderSections(sections);

    // Edit mode: show property sliders
    if (editMode) {
      this._renderEditControls(data);
    }
  }

  _buildSatelliteInspector(data, editMode) {
    const launchDate = data.launchDate ? new Date(data.launchDate) : null;
    const missionStart = data.missionStart ? new Date(data.missionStart) : null;
    const now = new Date();

    let opDuration = '—';
    if (missionStart && data.status === 'ACTIVE') {
      const ms = now - missionStart;
      const days = Math.floor(ms / 86400000);
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      const d = days % 30;
      opDuration = `${years}y ${months}m ${d}d`;
    }

    const sections = [
      {
        title: 'Mission Info',
        rows: [
          ['Full Name', data.fullName || data.name],
          ['Type', data.type],
          ['Operator', data.operator || '—'],
          ['Mission', data.mission || '—'],
          ['Status', data.status],
          ['Launch Date', launchDate ? launchDate.toLocaleDateString() : '—'],
          ['Mission Start', missionStart ? missionStart.toLocaleDateString() : '—'],
          ['Mission End', data.missionEnd || 'Ongoing'],
          ['Operational Duration', opDuration],
        ],
      },
      {
        title: 'Physical Properties',
        rows: [
          ['Mass', data.mass ? data.mass.toLocaleString() + ' kg' : '—'],
          ['Dimensions', data.dimensions || '—'],
        ],
      },
      {
        title: 'Orbital Parameters',
        rows: [
          ['Orbit Type', data.orbitType || '—'],
          ['Altitude', data.altitude ? data.altitude.toLocaleString() + ' km' : '—'],
          ['Velocity', data.velocity ? data.velocity.toFixed(2) + ' km/s' : '—'],
          ['Inclination', data.inclination != null ? data.inclination.toFixed(1) + '°' : '—'],
          ['Eccentricity', data.eccentricity != null ? data.eccentricity.toFixed(5) : '—'],
          ['Orbital Period', data.orbitalPeriod ? data.orbitalPeriod.toFixed(2) + ' min' : '—'],
        ],
      },
    ];

    this._renderSections(sections, { status: data.status });
  }

  _buildStarInspector(data, editMode) {
    const sections = [
      {
        title: 'Stellar Properties',
        rows: [
          ['Mass', this._formatMass(data.mass)],
          ['Radius', this._formatRadius(data.radius)],
          ['Temperature', data.temperature ? data.temperature.toLocaleString() + ' K' : '—'],
          ['Luminosity', data.luminosity ? data.luminosity.toExponential(2) + ' W' : '—'],
          ['Spectral Type', data.spectralType || '—'],
          ['Age', data.age ? (data.age / 1e9).toFixed(1) + ' Gyr' : '—'],
        ],
      },
    ];
    this._renderSections(sections);
    if (editMode) this._renderEditControls(data);
  }

  _buildBlackHoleInspector(data, editMode) {
    const c = 2.998e5; // km/s
    const G = 6.674e-20;
    const rs = data.mass ? (2 * G * data.mass) / (c * c) : 0;

    const sections = [
      {
        title: 'Black Hole Properties',
        rows: [
          ['Mass', this._formatMass(data.mass)],
          ['Schwarzschild Radius', rs ? rs.toExponential(2) + ' km' : '—'],
          ['Event Horizon', rs ? (rs * 2).toExponential(2) + ' km' : '—'],
          ['Type', rs > 1e10 ? 'Supermassive' : 'Stellar'],
        ],
      },
    ];
    this._renderSections(sections);
  }

  _buildInspectorActions(bodyData) {
    const btns = [
      { label: '🎯 Focus Camera', action: () => this.cosmos.focusBody(bodyData), cls: '' },
      { label: '🚀 Follow', action: () => this.cosmos.renderer.followBody(bodyData.mesh), cls: '' },
    ];

    const type = (bodyData.data || bodyData).type;
    if (type === 'star') {
      btns.push({ label: '💥 Supernova', action: () => this.cosmos.triggerSupernova(bodyData), cls: 'danger' });
      btns.push({ label: '⚫ → Black Hole', action: () => this.cosmos.convertToBlackHole(bodyData), cls: 'danger' });
    }
    if (type !== 'star' && type !== 'black-hole') {
      btns.push({ label: '💀 Destroy', action: () => this.cosmos.destroyPlanet(bodyData), cls: 'danger' });
    }

    btns.forEach(btn => {
      const el = document.createElement('button');
      el.className = 'inspector-btn' + (btn.cls ? ' ' + btn.cls : '');
      el.textContent = btn.label;
      el.addEventListener('click', btn.action);
      this.inspectorActions.appendChild(el);
    });
  }

  _renderSections(sections, opts = {}) {
    sections.forEach(section => {
      const sec = document.createElement('div');
      sec.className = 'inspector-section';

      const title = document.createElement('div');
      title.className = 'inspector-section-title';
      title.textContent = section.title;
      sec.appendChild(title);

      section.rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'inspector-row';

        const lEl = document.createElement('span');
        lEl.className = 'inspector-label';
        lEl.textContent = label;

        const vEl = document.createElement('span');
        vEl.className = 'inspector-value';

        if (label === 'Status' && opts.status) {
          const badge = document.createElement('span');
          badge.className = 'status-badge ' + opts.status.toLowerCase().replace('_', '-');
          badge.textContent = opts.status;
          vEl.appendChild(badge);
        } else if (label === 'Mass') {
          vEl.className += ' gold';
          vEl.textContent = value;
        } else if (label === 'Temperature') {
          vEl.className += ' orange';
          vEl.textContent = value;
        } else {
          vEl.textContent = value;
        }

        row.appendChild(lEl);
        row.appendChild(vEl);
        sec.appendChild(row);
      });

      this.inspectorBody.appendChild(sec);
    });
  }

  _renderEditControls(data) {
    const editSec = document.createElement('div');
    editSec.className = 'inspector-section';

    const title = document.createElement('div');
    title.className = 'inspector-section-title';
    title.textContent = 'Edit Properties & Orbit';
    editSec.appendChild(title);

    const bodyId = data.name?.toLowerCase() || data.id;
    const physBody = this.cosmos.physics.getBody(bodyId);

    // Mass slider
    if (data.mass != null) {
      const logMass = Math.log10(data.mass);
      editSec.appendChild(this._createSlider('Mass (10^x kg)', logMass, 15, 31, 0.1, (val) => {
        data.mass = Math.pow(10, val);
        if (physBody) physBody.mass = data.mass;
      }));
    }

    // Radius slider
    if (data.radius != null) {
      editSec.appendChild(this._createSlider('Radius Scale', 1.0, 0.2, 5.0, 0.1, (val) => {
        if (physBody) physBody.radius = data.radius * val;
      }));
    }

    // Temperature slider
    if (data.temperature != null) {
      editSec.appendChild(this._createSlider('Temperature (K)', data.temperature, 50, 30000, 100, (val) => {
        data.temperature = val;
      }));
    }

    // Velocity scale slider
    editSec.appendChild(this._createSlider('Velocity Scale', 1.0, 0.0, 5.0, 0.1, (val) => {
      if (physBody) {
        const currentSpeed = physBody.speed();
        if (currentSpeed > 0) {
          const factor = (data.velocity || 30) * val / currentSpeed;
          physBody.velocity.x *= factor;
          physBody.velocity.y *= factor;
          physBody.velocity.z *= factor;
        } else {
          physBody.velocity.y = val * 10;
        }
      }
    }));

    // Orbit Distance slider
    if (data.semiMajorAxis != null) {
      editSec.appendChild(this._createSlider('Orbital Distance Scale', 1.0, 0.2, 3.0, 0.05, (val) => {
        if (physBody) {
          const currentDist = Math.sqrt(physBody.position.x ** 2 + physBody.position.y ** 2 + physBody.position.z ** 2);
          if (currentDist > 0) {
            const factor = (data.semiMajorAxis * val) / currentDist;
            physBody.position.x *= factor;
            physBody.position.y *= factor;
            physBody.position.z *= factor;
          }
        }
      }));
    }

    this.inspectorBody.appendChild(editSec);
  }

  _createSlider(label, value, min, max, step, onChange) {
    const group = document.createElement('div');
    group.className = 'prop-slider-group';

    const lbl = document.createElement('div');
    lbl.className = 'prop-slider-label';
    const span = document.createElement('span');
    span.textContent = label;
    const valSpan = document.createElement('span');
    valSpan.textContent = value.toFixed(2);
    lbl.appendChild(span);
    lbl.appendChild(valSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'prop-slider';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;

    slider.addEventListener('input', () => {
      valSpan.textContent = parseFloat(slider.value).toFixed(2);
      onChange(parseFloat(slider.value));
    });

    group.appendChild(lbl);
    group.appendChild(slider);
    return group;
  }

  closeInspector() {
    this.rightPanel.classList.add('hidden');
    this.selectedBody = null;
    this.cosmos.deselectAll();
  }

  // =============================================
  // LABELS
  // =============================================
  createLabel(id, name, mesh) {
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.textContent = name;
    label.id = 'label-' + id;
    this.labelsContainer.appendChild(label);
    this.labels.set(id, { el: label, mesh });
    return label;
  }

  removeLabel(id) {
    const label = this.labels.get(id);
    if (label && label.el.parentNode) {
      label.el.parentNode.removeChild(label.el);
    }
    this.labels.delete(id);
  }

  updateLabels(camera, renderer) {
    if (!this.labelsVisible) return;

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    this.labels.forEach(({ el, mesh }) => {
      if (!mesh || !mesh.position) { el.style.display = 'none'; return; }

      const worldPos = mesh.position.clone();
      worldPos.project(camera);

      if (worldPos.z > 1) { el.style.display = 'none'; return; }

      const x = (worldPos.x * 0.5 + 0.5) * width;
      const y = (1 - (worldPos.y * 0.5 + 0.5)) * height;

      if (x < 0 || x > width || y < 0 || y > height) {
        el.style.display = 'none';
        return;
      }

      el.style.display = 'block';
      el.style.left = x + 'px';
      el.style.top = (y - 30) + 'px';
    });
  }

  // =============================================
  // CONTEXT MENU
  // =============================================
  showContextMenu(x, y, bodyData) {
    this.selectedBody = bodyData;
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.classList.remove('hidden');
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
  }

  // =============================================
  // TOAST NOTIFICATIONS
  // =============================================
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 500);
    }, duration);
  }

  // =============================================
  // BOTTOM BAR UPDATE
  // =============================================
  updateBottomBar(physics, camera, bodyCount) {
    // Simulation time
    const simTime = physics.time;
    const simDate = new Date(2000, 0, 1);
    simDate.setSeconds(simDate.getSeconds() + simTime);
    this.simDate.textContent = simDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    }) + ' ' + simDate.toLocaleTimeString('en-US', { hour12: false });

    // Speed
    const speedLabels = {
      1: '1×', 10: '10×', 100: '100×', 1000: '1K×', 10000: '10K×',
    };
    this.simSpeedDisplay.textContent = speedLabels[Math.abs(physics.timeScale)] ||
      Math.abs(physics.timeScale) + '×';
    if (physics.paused) this.simSpeedDisplay.textContent = '⏸ Paused';

    // Body count
    this.bodyCount.textContent = bodyCount + ' bodies';

    // Camera distance (AU)
    const dist = camera.position.length();
    const au = (dist / 30).toFixed(2);
    this.cameraDistance.textContent = au + ' AU';
  }

  updateFPS(fps) {
    this.fpsDisplay.textContent = fps.toFixed(0) + ' FPS';
  }

  // =============================================
  // SELECTED ITEM HIGHLIGHT IN LIST
  // =============================================
  highlightSelected(id) {
    document.querySelectorAll('.obj-item').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`.obj-item[data-id="${id}"]`);
    if (el) el.classList.add('selected');
  }

  // =============================================
  // FORMAT HELPERS
  // =============================================
  _formatMass(kg) {
    if (!kg) return '—';
    if (kg >= 1e30) return (kg / 1.989e30).toFixed(2) + ' M☉';
    if (kg >= 1e24) return (kg / 5.972e24).toFixed(2) + ' M⊕';
    if (kg >= 1e21) return kg.toExponential(2) + ' kg';
    return kg.toExponential(2) + ' kg';
  }

  _formatRadius(km) {
    if (!km) return '—';
    if (km >= 100000) return (km / 1000).toFixed(0) + ' Mm';
    return km.toFixed(0) + ' km';
  }

  _formatDistance(km) {
    if (!km) return '—';
    const au = km / 149597870.7;
    if (au >= 0.1) return au.toFixed(3) + ' AU';
    return km.toLocaleString() + ' km';
  }

  _formatPeriod(days) {
    if (days >= 365.25) return (days / 365.25).toFixed(2) + ' yr';
    if (days >= 1) return days.toFixed(1) + ' d';
    return (days * 24).toFixed(1) + ' h';
  }
}
