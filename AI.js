const multipliers = { holes: 648.9, height: 11.8, bumps: 312.2, pillars: 27.2, clear: 130.7, points: 0.36 }
function check_for_collision_PURE(x, y, r, name, board_to_check) {
    let shape = piece_rotations[name][r];
    for (let block of shape) {
        let tx = x + block[0];
        let ty = y + block[1];
        if (tx < 0 || tx >= columns || ty >= rows) {
            return true;
        }
        if (piece_names_permanent.includes(board_to_check[ty*columns+tx])) {
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

function generate_all_paths(piece_name, board_to_check = board) {
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

function simulate_clear_rows(board_to_check) {
    let temp = board_to_check.slice();
    let cleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        let isFull = true;
        for (let x = 0; x < columns; x++) {
            if (temp[y * columns + x] === blank) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            temp.splice(y * columns, columns);
            cleared += 1;
        }
    }
    // Prepend new blank rows
    if (cleared > 0) {
        temp = new Array(cleared * columns).fill(blank).concat(temp);
    }
    return [temp, cleared];
}

function simulate_paths(all_paths,piece_name,board_to_check=board) {
    let best_path = []
    let min_cost = null
    let temp_board = board_to_check.slice()
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
            let target_index = (spy+y)*columns+(spx+x)
            temp_board[target_index] = piece_name.toLowerCase()
        }
        let [processed_board, line_clears] = simulate_clear_rows(temp_board)
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
            let target_index = (spy+y)*columns+(spx+x)
            temp_board[target_index] = blank
        }
    }
    return {path:best_path,cost:min_cost}
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
        let landing = possible_ladings_active[i]
        let board_with_landed_piece = board.slice()
        let piece_name = landing.piece
        let spx = landing.x
        let spy = landing.y
        let spr = landing.r
        let shape = piece_rotations[piece_name][spr]
        for (let o=0;o<shape.length;o++) {
            let [x,y] = shape[o]
            board_with_landed_piece[(spy+y)*columns + (spx+x)] = piece_name.toLowerCase()
        }
        board_with_landed_piece = simulate_clear_rows(board_with_landed_piece)[0]
        let possible_ladings_held = generate_all_paths(held_piece,board_with_landed_piece)
        let result_held = simulate_paths(possible_ladings_held,held_piece,board_with_landed_piece)
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

function get_column(x,board) {
    let column = []
    for (let y=0;y<rows;y++) {
        column.push(board[y*columns+x])
    }
    return column
}

function calculate_holes(board) {
    let cost = 0
    for(let x = 0;x<columns;x++) {
        column_data = get_column(x,board).join('')
        trimmed_column_data = column_data.trimStart()
        cost += trimmed_column_data.split(' ').length - 1
    }
    return cost
}

function get_heighest_block(x,board) {
    for(let y = 0;y<rows;y++) {
        if (board[y*columns+x]!==' ') {
            return rows - y
        }
    }
    return 0
}

function calculate_pillars(board) {
    let pillar_cost = 0
    let pillar_count = 0
    let pillar_location = null
    for (let x=0;x<columns;x++) {
        let has_pillar = false
        let highest_left = x-1>=0?get_heighest_block(x-1,board):Infinity
        let highest_right = x+1<columns?get_heighest_block(x+1,board):Infinity
        let highest_block = get_heighest_block(x,board)
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
    let holes = calculate_holes(board)
    return pillar_count===1&&holes===0&&pillars_on_edge?[holes,-(Math.min(pillar_cost,4)/6)]:[holes,pillar_cost]
}

function calculate_bumpyness(board) {
    let bump_cost = 0
    for (let x=0;x<columns-1;x++) {
        bump_cost += Math.abs(get_heighest_block(x,board) - get_heighest_block(x+1,board))
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

function ai_mode_2() {
    let possible_ladings_active = generate_all_paths(active_piece_name)
    let result_active = simulate_paths(possible_ladings_active,active_piece_name)
    best_path = result_active.path
    let min_cost_active = result_active.cost
    for (let i=0;i<possible_ladings_active.length;i++) {
        let landing = possible_ladings_active[i]
        let board_with_landed_piece = board.slice()
        let piece_name = landing.piece
        let spx = landing.x
        let spy = landing.y
        let spr = landing.r
        let shape = piece_rotations[piece_name][spr]
        for (let o=0;o<shape.length;o++) {
            let [x,y] = shape[o]
            board_with_landed_piece[(spy+y)*columns + (spx+x)] = piece_name.toLowerCase()
        }
        board_with_landed_piece = simulate_clear_rows(board_with_landed_piece)[0]
        let possible_ladings_held = generate_all_paths(held_piece_name,board_with_landed_piece)
        let result_held = simulate_paths(possible_ladings_held,held_piece_name,board_with_landed_piece)
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