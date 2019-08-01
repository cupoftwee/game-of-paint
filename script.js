/* --- Palettes & Settings Notes --- */
// Scale brewer palettes: BuPu, RdPu, Spectral, Set3, YlGnBu
// Modes - lrgb (rich & bright), lab (clear, good contrast)

// These *work*
// chroma.scale('YlGnBu').gamma(10).classes(32)
// chroma.scale('YlGnBu').padding([-0.5, 0.25]).gamma(5).mode('lab') @ 1k iterations
// chroma.bezier(['darkred', 'deeppink', 'lightyellow', 'lightgreen', 'teal']).scale().gamma(5)
// chroma.scale('YlGnBu').padding([-0.5, 0.25]).gamma(5).mode('lab')//.classes(32)//.gamma(6).mode('lrgb')
// const yurple = ['goldenrod', 'gold', 'moccasin', 'plum', 'violet', 'purple']; // .gamma(6).mode('lrgb')
// chroma.scale(yurple).gamma(6).mode('lrgb')  


/* --- Utilities & Dependencies --- */
const chroma = window.chroma;

const q = (query) => document.querySelector(query);

const scaleToRange = (val, fromRange = [0, 500], toRange = [0, 1]) => {
  const diff = fromRange[1] - fromRange[0];
  const scaledDiff = toRange[1] - toRange[0];
  
  return scaledDiff * (val - fromRange[0]) / diff + toRange[0];
};

const getColor = (cell, iterations) => {
  const { isAlive, deaths, lastHue } = cell;
  const colorScale = chroma;
    .scale('Spectral')
    .gamma(6)
    .mode('lrgb');
  const value = (iterations % 5 === 0 ) ? deaths / iterations : lastHue;
  const scaledColor = colorScale(value);

  //console.log(`SCALED COLOR RETURNED: ${scaledColor} FROM VALUE: ${value} = ${cell.deaths} / ${iterations}`);
  return lastHue ? chroma.blend(scaledColor, lastHue, 'lighten') : scaledColor;
};

/* --- Constants --- */
const MAX_GENERATIONS   = 500;    // stop rendering new steps after this iteration
const CELL_SIZE         = 5       // Size of each cell in pixels - also from viewport
const CELL_SHADOW_SIZE  = 0;      // Size of the shadow around each cell
const WINDOW_HEIGHT     = window.innerHeight;
const WINDOW_WIDTH      = window.innerWidth;
const SIMULATION_SIZE   = WINDOW_WIDTH / CELL_SIZE; // TODO - should come from viewport
const PALETTE           = chroma.scale();
const REFRESH_MS        = 0;      // How often to re-render simulation in ms (1000ms = 1s)
const DEFAULT_GRID_ITEM = { 
  isAlive: false, 
  deaths: 0, 
  lastHue: undefined 
};

/* --- State --- */
let SIMULATION_RUNNING  = true;   // on/off toggle
let SIMULATION_INSTANCE = null;   // will contain the setInterval render loop instance
let SIMULATION_CELL_MAX = SIMULATION_SIZE * SIMULATION_SIZE;
let GENERATIONS         = 1;      // # of iterations
let GRID                = null;   // grid data, 2d array of objs


/* --- Rendering --- */
// set up & initialize grid
const gameEl = q('#gol');

GRID = create_grid();

//draw_grid();

gameEl.style.width = `${CELL_SIZE}px`;
gameEl.style.height = `${CELL_SIZE}px`;

function updateLoading () {
  const loaded  = SIMULATION_SIZE * SIMULATION_SIZE * GENERATIONS;
  const total   = SIMULATION_SIZE * SIMULATION_SIZE * MAX_GENERATIONS;
  
  q('#count').textContent = `
    ${loaded.toLocaleString()} / ${total.toLocaleString()} cells loaded
  `;
}

const runSim = setInterval(() => {
  if (SIMULATION_RUNNING) {    
    try {
      if (GENERATIONS >= MAX_GENERATIONS) {
        throw new Error('max generations reached.');
      }
      
      step();
      updateLoading();
      //draw_grid();
      GENERATIONS++;
    } catch (e) {
      q('#loading').style.display = 'none';
      draw_grid();
      SIMULATION_RUNNING = false;
      console.warn('WARNING - stopping draw due to error', e);
      SIMULATION_INSTANCE ? clearInterval(SIMULATION_INSTANCE) : null;
      clearInterval(runSim);
    }
  } else {
     clearInterval(runSim);
  }
}, REFRESH_MS);


/* --- load Handling (disabled) --- */
// q('#progress').onclick = () => {
//   // if (!SIMULATION_INSTANCE) {
//   //   SIMULATION_INSTANCE = setInterval(runSimulation, REFRESH_MS);
//   // }
  
// //   if (GENERATIONS === 0) {
// //     draw_grid();
// //   } else {
    
// //   }
//   step(); 
//   draw_grid(); 
//   GENERATIONS++;
// };

// if (SIMULATION_RUNNING) {
//   SIMULATION_INSTANCE = setInterval(runSimulation, REFRESH_MS);
// }

/* --- Controls (disabled) --- */
// q('#step').onclick = () => {
//   // if (!SIMULATION_INSTANCE) {
//   //   SIMULATION_INSTANCE = setInterval(runSimulation, REFRESH_MS);
//   // }
  
// //   if (GENERATIONS === 0) {
// //     draw_grid();
// //   } else {
    
// //   }
//   step(); 
//   draw_grid(); 
//   GENERATIONS++;
// };

// q('#reset').onclick = () => {
//   SIMULATION_RUNNING = false;
//   clearInterval(SIMULATION_INSTANCE);
  
//   GRID = create_grid();
  
//   q("#playpause").textContent = "Start"; 
// };

// q('#playpause').onclick = () => {
//   console.log('PLAYPAUSE CLICK!');
  
//   SIMULATION_RUNNING = !SIMULATION_RUNNING;

//   if (SIMULATION_RUNNING) {
//      q("#playpause").textContent = "Pause"; 
//   } else {
//      q("#playpause").textContent = "Resume"; 
//   }
  
//   draw_grid();
// };


/* --- Grid Functions --- */
function create_grid(opts = {}, currentGrid = []) {
  let gridData = [];//[...currentGrid];
  
  for (let y = 0; y < SIMULATION_SIZE; y++) {
    let column = [];
    
    for (let x = 0; x < SIMULATION_SIZE; x++) {
      const defaultCellValue = { 
        isAlive: (Math.random() < 0.71), 
        deaths: 0 
      };
      
      column.push(opts.override ? opts.override : defaultCellValue);
    }
    
    gridData.push(column);
  }

  return gridData;
}

function step() {
  /* GAME OF LIFE RULES: 
    A live cell with fewer than two live neighbours dies, 
      as if caused by under-population.
    A live cell with two or three live neighbours lives, 
      surviving on to the next generation.
    A live cell with more than three live neighbours dies, 
      as if by overcrowding.
    A dead cell with exactly three live neighbours regrows, 
      as if by reproduction.
  */
  let newData = create_grid({ override: DEFAULT_GRID_ITEM });
  
  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      const n = getAliveNeighbors(x,y); 
      const { isAlive, deaths, lastHue } = GRID[y][x];
      
      if ((n == 2 && isAlive) || n == 3) {
        newData[y][x] = { isAlive: true, deaths, lastHue };
      } else {
        newData[y][x] = { isAlive: false, deaths: deaths + 1, lastHue };
      }
    }
  } 
  
  GRID = newData;

//   for (let col = 0; col < GRID.length; col++) {
//     for (let row = 0; row < GRID[col].length; row++) {
//       const n = getAliveNeighbors(row, col);
//       const { deaths } = GRID[col][row];
      
//       const regrowthCondition = (n === 3 && GRID[col][row]);
//       const survivalCondition = (n === 2 && GRID[col][row]);
      
//       if ((n == 2 && GRID[col][row] == true) || n == 3) {
//       //if (survivalCondition || regrowthCondition) {
//         newData[col][row] = { isAlive: true, deaths };
//       } else {
//         // pixels to pixels, ints to increments. RIP.
//         newData[col][row] = { isAlive: false, deaths: deaths + 1 };
//       }
//     }
//   }
}

function getAliveNeighbors(x, y) {
  let i = 0;
  
  i = i + checkNeighbor(x - 1, y - 1);
  i = i + checkNeighbor(x, y - 1);
  i = i + checkNeighbor(x + 1 ,y - 1);
  
  i = i + checkNeighbor(x - 1, y);
  i = i + checkNeighbor(x + 1, y);
  
  i = i + checkNeighbor(x - 1,y + 1);
  i = i + checkNeighbor(x, y + 1);
  i = i + checkNeighbor(x + 1, y + 1);
  
  return i;
}

function checkNeighbor(x, y) {
  if (x >= 0 && y >= 0 && GRID.length > y && GRID[y].length > x) {
    if (GRID[y][x] && GRID[y][x].isAlive) {
      return 1;
    }
  } 
  
  return 0;
}

/* --- Drawing --- */
function draw_grid() {
  // console.log(`--- Draw grid called on iteration: ${GENERATIONS} ---`);
  // console.log('grid data: ', GRID);

  let boxshadows = [];
  
  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      const width = x * CELL_SIZE;
      const height = y * CELL_SIZE;
      const cell = GRID[y][x];
      
      if (cell) {
        // opacity = # of deaths in a cell / iterations;
        // const opacity = cell.isAlive ? 0 : (cell.deaths) / GENERATIONS;
        // const opacity = 1;
        // const color = getColor(cell, GENERATIONS);
        // const shadowColor = `rgba(${color}  ${opacity})`;
        
        const shadowColor = getColor(cell, GENERATIONS);
        
        const dimensions = `${width}px ${height}px `;
        const shadow = `${CELL_SHADOW_SIZE}px ${shadowColor}`;
        
        //console.log(`grid ${x}, ${y}, isAlive: ${GRID[y][x].isAlive} | deaths (${GRID[y][x].deaths}) / iterations (${GENERATIONS}) = opacity (${opacity}) color: ${color}`);
        // console.log('full shadow applied: ', `${dimensions} ${shadow}`);
        // console.groupEnd();
        
        boxshadows.push(`${dimensions} ${shadow}`);
      }
    }
  }
  
  gameEl.style.boxShadow = boxshadows.join(",");
}
