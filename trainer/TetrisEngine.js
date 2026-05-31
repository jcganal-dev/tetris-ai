const pieces = {
    L: [[[0,0],[-1,0],[1,0],[1,-1]], [4, 1]],
    J: [[[0,0],[-1,0],[1,0],[-1,-1]], [4, 1]],
    Z: [[[0,0],[0,-1],[-1,-1],[1,0]], [4, 1]],
    S: [[[0,0],[0,-1],[1,-1],[-1,0]], [4, 1]],
    T: [[[0,0],[0,-1],[-1,0],[1,0]], [4, 1]],
    I: [[[0,0],[1,0],[-1,0],[-2,0]], [5, 1]],
    O: [[[0,0],[1,0],[1,1],[0,1]], [4, 0]],
};

const rotate_left_dict = {'0,-1':[-1,0],'-1,0':[0,1],'0,1':[1,0],'1,0':[0,-1],'1,-1':[-1,-1],'-1,-1':[-1,1],'-1,1':[1,1],'1,1':[1,-1],'0,0':[0,0]};
const rotate_right_dict = {'-1,0':[0,-1],'0,1':[-1,0],'1,0':[0,1],'0,-1':[1,0],'-1,-1':[1,-1],'-1,1':[-1,-1],'1,1':[-1,1],'1,-1':[1,1],'0,0':[0,0]};
const rotate_line_left_dict = {'-2,0':[0,1],'-2,-1':[-1,1],'-1,0':[0,0],'-1,-1':[-1,0],'-1,1':[1,0],'-1,-2':[-2,0],'0,0':[0,-1],'0,-2':[-2,-1],'0,-1':[-1,-1],'0,1':[1,-1],'1,0':[0,-2],'1,-1':[-1,-2]};
const rotate_line_right_dict = {'0,1':[-2,0],'-1,1':[-2,-1],'0,0':[-1,0],'-1,0':[-1,-1],'1,0':[-1,1],'-2,0':[-1,-2],'0,-1':[0,0],'-2,-1':[0,-2],'-1,-1':[0,-1],'1,-1':[0,1],'0,-2':[1,0],'-1,-2':[1,-1]};

class TetrisEngine {
    constructor(multipliers) {
        this.rows = 24;
        this.columns = 10;
        this.multipliers = multipliers;
        this.piece_names = ['L','J','O','S','Z','T','I'];
        this.piece_names_lower = this.piece_names.map(n => n.toLowerCase());
        this.blank = ' ';
        
        this.piece_rotations = this.preloadRotations();
        this.board = new Array(this.rows * this.columns).fill(this.blank);
        this.active_piece = null;
        this.active_piece_name = null;
        this.active_piece_r = 0;
        this.held_piece_name = null;
        this.seven_bag = this.shuffle([...this.piece_names]);
        this.game_over = false;
        this.score = 0;
        this.lines_cleared = 0;
        
        this.points = { 0:0, 1:40, 2:100, 3:300, 4:1200 };
        this.spawnPiece();
    }

    preloadRotations() {
        let rotations = {};
        for (let name of this.piece_names) {
            let shape = pieces[name][0];
            let list = [shape];
            let curr = shape;
            for (let i = 1; i < 4; i++) {
                if (name !== 'O' && name !== 'I') {
                    curr = curr.map(b => rotate_right_dict[b.join(',')]);
                } else if (name === 'I') {
                    curr = curr.map(b => rotate_line_right_dict[b.join(',')]);
                } else {
                    curr = shape;
                }
                list.push(curr);
            }
            rotations[name] = list;
        }
        return rotations;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    spawnPiece() {
        if (this.game_over) return;
        let name = this.seven_bag.shift();
        if (this.seven_bag.length === 0) this.seven_bag = this.shuffle([...this.piece_names]);
        
        this.active_piece_name = name;
        this.active_piece_r = 0;
        let spawn_info = pieces[name];
        this.active_piece = [spawn_info[0], [spawn_info[1][0], spawn_info[1][1] + 3]];
        
        if (this.checkCollision(0, 0, this.active_piece[0])) {
            this.game_over = true;
        }
    }

    checkCollision(x_off, y_off, shape, board = this.board) {
        let [_, [spx, spy]] = this.active_piece;
        spx += x_off;
        spy += y_off;
        for (let block of shape) {
            let tx = spx + block[0];
            let ty = spy + block[1];
            if (tx < 0 || tx >= this.columns || ty >= this.rows) return true;
            if (ty >= 0 && this.piece_names_lower.includes(board[ty * this.columns + tx])) return true;
        }
        return false;
    }

    checkCollisionPure(x, y, r, name, board = this.board) {
        let shape = this.piece_rotations[name][r];
        for (let block of shape) {
            let tx = x + block[0];
            let ty = y + block[1];
            if (tx < 0 || tx >= this.columns || ty >= this.rows) return true;
            if (ty >= 0 && this.piece_names_lower.includes(board[ty * this.columns + tx])) return true;
        }
        return false;
    }

    lockPiece() {
        let [shape, [spx, spy]] = this.active_piece;
        shape.forEach(block => {
            let ty = spy + block[1];
            let tx = spx + block[0];
            if (ty >= 0) this.board[ty * this.columns + tx] = this.active_piece_name.toLowerCase();
        });
        let clears = this.clearRows();
        this.lines_cleared += clears;
        this.score += this.points[clears];
    }

    clearRows() {
        let clears = 0;
        for (let y = this.rows - 1; y >= 0; y--) {
            let full = true;
            for (let x = 0; x < this.columns; x++) {
                if (this.board[y * this.columns + x] === this.blank) {
                    full = false;
                    break;
                }
            }
            if (full) {
                this.board.splice(y * this.columns, this.columns);
                clears++;
            }
        }
        if (clears > 0) {
            this.board = new Array(clears * this.columns).fill(this.blank).concat(this.board);
        }
        return clears;
    }

    hold() {
        if (this.held_piece_name === null) {
            this.held_piece_name = this.active_piece_name;
            this.spawnPiece();
        } else {
            let temp = this.held_piece_name;
            this.held_piece_name = this.active_piece_name;
            this.active_piece_name = temp;
            let spawn_info = pieces[temp];
            this.active_piece = [spawn_info[0], [spawn_info[1][0], spawn_info[1][1] + 3]];
        }
        this.active_piece_r = 0;
    }

    generateAllPaths(name) {
        let spawn_info = pieces[name];
        let queue = [{ x: spawn_info[1][0], y: spawn_info[1][1] + 3, r: 0, path: [] }];
        let visited = new Set();
        let landings = [];

        while (queue.length > 0) {
            let item = queue.shift();
            let state = (item.x << 16) | (item.y << 8) | item.r;
            if (visited.has(state)) continue;
            visited.add(state);

            let moves = [
                { nx: -1, ny: 0, nr: 0, k: 'L' },
                { nx: 1, ny: 0, nr: 0, k: 'R' },
                { nx: 0, ny: 1, nr: 0, k: 'D' },
                { nx: 0, ny: 0, nr: 1, k: 'X' },
                { nx: 0, ny: 0, nr: -1, k: 'Z' },
                { nx: 0, ny: 0, nr: 2, k: 'U' }
            ];

            for (let m of moves) {
                let nx = item.x + m.nx;
                let ny = item.y + m.ny;
                let nr = (item.r + m.nr + 4) % 4;
                if (!this.checkCollisionPure(nx, ny, nr, name)) {
                    queue.push({ x: nx, y: ny, r: nr, path: [...item.path, m.k] });
                } else if (m.k === 'D') {
                    landings.push(item);
                }
            }
        }
        return landings;
    }

    simulatePaths(paths, name) {
        let best_path = null;
        let best_state = null;
        let min_cost = Infinity;
        let temp_board = [...this.board];

        for (let state of paths) {
            let shape = this.piece_rotations[name][state.r];
            let top_y = state.y;
            for (let b of shape) {
                top_y = Math.min(top_y, state.y + b[1]);
                temp_board[(state.y + b[1]) * this.columns + (state.x + b[0])] = name.toLowerCase();
            }

            let [processed_board, clears] = this.simulateClearRows(temp_board);
            let holes = this.calculateHoles(processed_board);
            let pillars = this.calculatePillars(processed_board);
            let bumps = this.calculateBumpiness(processed_board);
            
            let line_reward = (holes === 0 && clears < 4) ? clears : -clears;
            let height = this.rows - top_y;
            
            let cost = holes * this.multipliers.holes +
                       (height * (height / 8)) * this.multipliers.height +
                       pillars * this.multipliers.pillars +
                       line_reward * this.multipliers.clear +
                       bumps * this.multipliers.bumps;

            if (cost < min_cost) {
                min_cost = cost;
                best_path = state.path;
                best_state = state;
            }

            for (let b of shape) {
                temp_board[(state.y + b[1]) * this.columns + (state.x + b[0])] = this.blank;
            }
        }
        return { path: best_path, state: best_state, cost: min_cost };
    }

    simulateClearRows(b) {
        let temp = [...b];
        let clears = 0;
        for (let y = this.rows - 1; y >= 0; y--) {
            let full = true;
            for (let x = 0; x < this.columns; x++) {
                if (temp[y * this.columns + x] === this.blank) { full = false; break; }
            }
            if (full) { temp.splice(y * this.columns, this.columns); clears++; }
        }
        if (clears > 0) temp = new Array(clears * this.columns).fill(this.blank).concat(temp);
        return [temp, clears];
    }

    calculateHoles(b) {
        let cost = 0;
        for (let x = 0; x < this.columns; x++) {
            let foundBlock = false;
            for (let y = 0; y < this.rows; y++) {
                if (b[y * this.columns + x] !== this.blank) foundBlock = true;
                else if (foundBlock) cost++;
            }
        }
        return cost;
    }

    getHighestBlock(x, b) {
        if (x < 0 || x >= this.columns) return 999;
        for (let y = 0; y < this.rows; y++) {
            if (b[y * this.columns + x] !== this.blank) return this.rows - y;
        }
        return 0;
    }

    calculatePillars(b) {
        let pillar_cost = 0;
        let pillar_count = 0;
        let pillar_loc = null;
        for (let x = 0; x < this.columns; x++) {
            let hl = this.getHighestBlock(x - 1, b);
            let hr = this.getHighestBlock(x + 1, b);
            let hb = this.getHighestBlock(x, b);
            if (hl - hb > 1 && hr - hb > 1) {
                pillar_cost += Math.min(hl - hb, hr - hb);
                pillar_count++;
                pillar_loc = x;
            }
        }
        let edge = (pillar_loc === 0 || pillar_loc === this.columns - 1);
        if (pillar_count === 1 && edge) return -(Math.min(pillar_cost, 4) / 6);
        return pillar_cost;
    }

    calculateBumpiness(b) {
        let cost = 0;
        for (let x = 0; x < this.columns - 1; x++) {
            cost += Math.abs(this.getHighestBlock(x, b) - this.getHighestBlock(x + 1, b));
        }
        return cost / this.columns;
    }

    step() {
        if (this.game_over) return false;

        let landingsActive = this.generateAllPaths(this.active_piece_name);
        let resActive = this.simulatePaths(landingsActive, this.active_piece_name);
        
        let resHeld = { cost: Infinity, path: null, state: null };
        if (this.held_piece_name) {
            let landingsHeld = this.generateAllPaths(this.held_piece_name);
            resHeld = this.simulatePaths(landingsHeld, this.held_piece_name);
        }

        if (resHeld.cost < resActive.cost) {
            this.hold();
            landingsActive = this.generateAllPaths(this.active_piece_name);
            resActive = this.simulatePaths(landingsActive, this.active_piece_name);
        }

        if (resActive.state) {
            let target = resActive.state;
            this.active_piece = [this.piece_rotations[this.active_piece_name][target.r], [target.x, target.y]];
            this.lockPiece();
            this.spawnPiece();
        } else {
            this.game_over = true;
        }
        return !this.game_over;
    }
}

if (typeof module !== 'undefined') {
    module.exports = TetrisEngine;
}
