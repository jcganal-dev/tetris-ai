const multipliers = { holes: 648.9, height: 11.8, bumps: 312.2, pillars: 27.2, clear: 130.7, points: 0.36 }
let bit_board = new Uint16Array(24)
function check_for_collision_PURE(x, y, r, name, board_to_check=bit_board) {
    let shape = piece_rotations[name][r];
    for (let block of shape) {
        let tx = x + block[0];
        let ty = y + block[1];
        if (tx < 0 || tx >= columns || ty >= rows) {
            return true;
        }
        if (ty >= 0 && (board_to_check[ty] & (1 << (9 - tx)))) {
            return true;
        }
    }
    return false;
}

function execute_move(instruction) {
    if (instruction==='L') {
        move(-1,0)
    }
    else if (instruction==='R') {
        move(1,0)
    }
    else if (instruction==='A') {
        rotate(2)
    }
    else if (instruction==='Z') {
        rotate(-1)
    }
    else if (instruction==='D') {
        move(0,1)
    }
    else if (instruction==='X') {
        rotate(1)
    }
    else if (instruction==='C') {
        hold()
    }
    else if (instruction===' ') {
        while(!check_for_collision(0,1,active_piece[0])[0]) move(0,1);
        lock_piece()
        spawn_piece()
    }
}

function generate_all_paths(piece_name, board_to_check = bit_board) {
    let piece = pieces[piece_name]
    let queue = [{x:piece[1][0],y:piece[1][1],r:0,path:[],piece:piece_name}]
    let visited_states = new Set()
    let possible_landings = []

    while(queue.length>0) {
        let item = queue.shift()

        current_state = (item.x<<16) | (item.y<<8) | item.r

        if (visited_states.has(current_state)) continue;
        visited_states.add(current_state)

        // 3. Try every move a player can make
        let moves = [
            { nx: -1, ny: 0, nr: 0,  key: 'L' }, // Left
            { nx: 1,  ny: 0, nr: 0,  key: 'R' }, // Right
            { nx: 0,  ny: 1, nr: 0,  key: 'D' }, // Down
            { nx: 0,  ny: 0, nr: 1,  key: 'X' }, // Rotate Right
            { nx: 0,  ny: 0, nr: -1, key: 'Z' }, // Rotate Left
            { nx: 0,  ny: 0, nr: 2,  key: 'A' } // Flip
        ];
        for (let move of moves) {
            let next_x = item.x + move.nx;
            let next_y = item.y + move.ny;
            let next_r = (item.r + move.nr + 4) % 4; // Assuming 4 rotations
            // Check if this specific rotation/position hits the board
            if (!check_for_collision_PURE(next_x, next_y, next_r, piece_name, board_to_check)) {
                queue.push({
                    x: next_x,
                    y: next_y,
                    r: next_r,
                    path: [...item.path, move.key],
                    piece: piece_name
                });
            } else {
                if (move.key === 'D') {
                    possible_landings.push(item);
                }
            }
        }
    }
    return possible_landings
}

function simulate_clear_rows(board_to_check=bit_board) {
    let result_board = new Uint16Array(rows);
    let cleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        if (board_to_check[y]===1023) {
            cleared += 1
        } else {
            result_board[y+cleared] = board_to_check[y]
        }
    }
    if (cleared > 0) {
        for (let y=0;y<cleared;y++) {
            result_board[y] = 0
        }
    }
    return [result_board, cleared];
}

function simulate_paths(all_paths,piece_name,board_to_check=bit_board) {
    let best_path = []
    let min_cost = null
    for (let i=0;i<all_paths.length;i++) {
        let state = all_paths[i]
        let spx = state.x
        let spy = state.y
        let r = state.r
        let shape = piece_rotations[piece_name][r]
        let height = spy
        for(let b=0;b<shape.length;b++) {
            let [x,y] = shape[b]
            height = Math.min(height,spy+y)
            board_to_check[spy+y] = board_to_check[spy+y] | (1 << (9 - (spx + x)))
        }
        let [processed_board, line_clears] = simulate_clear_rows(board_to_check)
        let [holes,pillars] = calculate_pillars(processed_board)
        let bumps = calculate_bumpyness(processed_board)
        clears = holes===0&&line_clears<4?line_clears:-line_clears
        height = rows-height
        let cost = holes*multipliers.holes + (height*(height/8))*multipliers.height + pillars*multipliers.pillars + clears*multipliers.clear + bumps*multipliers.bumps - (points[line_clears] * multipliers.points)
        if (i==0) {
            min_cost = cost
            best_path = state.path
        } else {
            if (cost<min_cost) {
                min_cost = cost
                best_path = state.path
            }
        }
        for(let b=0;b<shape.length;b++) {
            let [x,y] = shape[b]
            board_to_check[spy+y] = board_to_check[spy+y] & ~(1 << (9 - (spx + x)))
        }
    }
    return {path:best_path,cost:min_cost}
}

function calculate_holes(bit_board) {
    let holes = 0
    let has_block_flag = 0
    for(let y = 0;y<rows;y++) {
        let row_holes = has_block_flag & ~(bit_board[y])    
        while (row_holes>0) {
            holes += 1;
            row_holes = row_holes & (row_holes - 1)
        }
        has_block_flag = bit_board[y] | has_block_flag
    }
    return holes
}

function get_skyline(bit_board) {
    let heights = new Array(10).fill(0);
    let columns_found = 0; // Mask to track which columns we've already measured

    // One single pass from top to bottom
    for (let y = 0; y < rows; y++) {
        let row = bit_board[y];
        
        // Find blocks in this row that belong to columns we HAVEN'T measured yet
        let new_peaks = row & ~columns_found;

        if (new_peaks > 0) {
            // We hit a new peak! Figure out which column it belongs to
            for (let x = 0; x < 10; x++) {
                if ((new_peaks & (1 << x)) !== 0) {
                    heights[x] = rows - y;
                }
            }
            // Add these new peaks to our tracker so we ignore blocks below them
            columns_found = columns_found | new_peaks;
        }

        // Early Exit: If we've found the top block for all 10 columns, stop scanning!
        if (columns_found === 1023) {
            break; 
        }
    }
    
    // Returns an array like [14, 14, 12, 12, 10, 0, 0, 0, 4, 4]
    return heights; 
}

function calculate_pillars(bit_board) {
    let pillar_cost = 0
    let pillar_count = 0
    let pillar_location = null
    let peaks = get_skyline(bit_board)
    for (let x=0;x<columns;x++) {
        let has_pillar = false
        let highest_left = x-1>=0?peaks[x-1]:Infinity
        let highest_right = x+1<columns?peaks[x+1]:Infinity
        let highest_block = peaks[x]
        for (let y=rows;y>0;y--) {
            condition = highest_left-highest_block>3 && highest_right-highest_block>3
            if (condition) {
                pillar_cost += Math.min(highest_left-highest_block,highest_right-highest_block)
                has_pillar = has_pillar || condition
                if (has_pillar) {
                    pillar_location = x
                    pillar_count+=1
                    break
                }
            }
        }
    }
    let pillars_on_edge = pillar_location===0 || pillar_location===columns-1
    let holes = calculate_holes(bit_board)
    return pillar_count===1&&holes===0&&pillars_on_edge?[holes,-(Math.min(pillar_cost,4)/6)]:[holes,pillar_cost]
}

function calculate_bumpyness(bit_board) {
    let bump_cost = 0
    let peaks = get_skyline(bit_board)
    for (let x=0;x<columns-1;x++) {
        bump_cost += Math.abs(peaks[x] - peaks[x+1])
    }
    return bump_cost/columns
}

function ai_mode_3() {
    let [path1,cost1] = generate_2_ply(false)
    let [path2,cost2] = generate_2_ply(true)
    if (cost2>cost1) {
        best_path = path1
    } else {
        best_path = path2
    }
}

function generate_2_ply(reverse=false) {
    let active_piece = active_piece_name
    let held_piece = held_piece_name
    if (reverse) {
        active_piece = held_piece_name
        held_piece = active_piece_name
    }
    let possible_ladings_active = generate_all_paths(active_piece)
    let result_active = simulate_paths(possible_ladings_active,active_piece)
    let min_cost_active = Infinity
    for (let i=0;i<possible_ladings_active.length;i++) {
        let bit_board_copy = bit_board.slice()
        let landing = possible_ladings_active[i]
        let piece_name = landing.piece
        let spx = landing.x
        let spy = landing.y
        let spr = landing.r
        let shape = piece_rotations[piece_name][spr]
        for (let o=0;o<shape.length;o++) {
            let [x,y] = shape[o]
            bit_board_copy[spy+y] = bit_board_copy[spy+y] | (1 << (9 - (spx + x)))
        }
        bit_board_copy = simulate_clear_rows(bit_board_copy)[0]
        let possible_ladings_held = generate_all_paths(held_piece,bit_board_copy)
        let result_held = simulate_paths(possible_ladings_held,held_piece,bit_board_copy)
        if (min_cost_active>result_held.cost) {
            if (reverse) {
                best_path = ['C', ...landing.path,' ','C',...result_held.path]
            }
            else {
                best_path = [...landing.path,' ','C',...result_held.path]
            }
            min_cost_active = result_held.cost
        }
    }
    return [best_path, min_cost_active]
}

function ai_mode_2() {
    let possible_ladings_active = generate_all_paths(active_piece_name)
    let result_active = simulate_paths(possible_ladings_active,active_piece_name)
    best_path = result_active.path
    let min_cost_active = result_active.cost
    for (let i=0;i<possible_ladings_active.length;i++) {
        let bit_board_copy = bit_board.slice()
        let landing = possible_ladings_active[i]
        let piece_name = landing.piece
        let spx = landing.x
        let spy = landing.y
        let spr = landing.r
        let shape = piece_rotations[piece_name][spr]
        for (let o=0;o<shape.length;o++) {
            let [x,y] = shape[o]
            bit_board_copy[spy+y] = bit_board_copy[spy+y] | (1 << (9 - (spx + x)))
        }
        bit_board_copy = simulate_clear_rows(bit_board_copy)[0]
        let possible_ladings_held = generate_all_paths(held_piece_name,bit_board_copy)
        let result_held = simulate_paths(possible_ladings_held,held_piece_name,bit_board_copy)
        if (min_cost_active>result_held.cost) {
            best_path = [...landing.path,' ','C',...result_held.path]
            min_cost_active = result_held.cost
        }
    }
}


function ai_mode_1() {
    let all_paths = generate_all_paths(active_piece_name)
    let result = simulate_paths(all_paths,active_piece_name)
    let result_held = {cost: Infinity}
    if (pieces[held_piece_name]!==null) {
        let all_paths_held = generate_all_paths(held_piece_name)
        result_held = simulate_paths(all_paths_held,held_piece_name)
    }
    if (result.cost>result_held.cost) {
        best_path = ['C'].concat(result_held.path)
    } else {
        best_path = result.path
    }
}


function start_AI(mode) {
    for (let y = 0; y < 24; y++) {
        let row_bits = 0; // Build the binary row in a temporary CPU register first
        
        for (let x = 0; x < 10; x++) {
            // Check your visual board. 
            // (Change !== 0 to !== '_' or !== '' depending on what you use for empty space)
            if (board[(y * 10) + x] !== blank) { 
                row_bits = row_bits | (1 << (9 - x)); // Flip the bit to 1
            }
        }
        
        // Write the completed binary number to the Typed Array once per row
        bit_board[y] = row_bits; 
    }
    switch (mode) {
        case 1:
            ai_mode_1()
            break;
        case 2:
            ai_mode_2()
            break;
        case 3:
            ai_mode_3()
            break;
        default:
            break;
    }
}