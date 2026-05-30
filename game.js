const $ = (id) => document.getElementById(id)
const rows = 24
const columns = 10
const piece_names = ['L','J','O','S','Z','T','I']
const piece_names_permanent = piece_names.map(name=>name.toLowerCase())
const blank = ' '
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const points = {
    0:0,
    1:40,
    2:100,
    3:300,
    4:1200
}
let piece_rotations = preload_rotations()
let board = new Array(rows*columns).fill(blank)
let active_piece = null
let active_piece_name = null
let active_piece_r = 0
let held_piece = null
let held_piece_name = null
let preview_piece = null
let seven_bag = shuffle(piece_names.slice())
let game_over = false
let lines_cleared = 0
let score = 0
let best_path = null
let moves_per_frame = 1
let lastTime = 0;
let dropCounter = 0;
let dropInterval = 250  ;

function set_AI_speed(speed) {
    moves_per_frame = speed
}

function preload_rotations() {
    let rotations = {}
    for (let n = 0;n<piece_names.length;n++) {
        name = piece_names[n]
        let shape = pieces[name][0];
        test_piece_rotation = [shape];
        let curr = shape;
        for (let i = 1; i < 4; i++) {
            if (name !== 'O' && name !== 'I') {
                curr = curr.map(b => rotate_right_dict[b.join(',')]);
            } else if (name === 'I') {
                curr = curr.map(b => rotate_line_right_dict[b.join(',')]);
            } else {
                curr = shape;
            }
            test_piece_rotation.push(curr);
        }
        rotations[piece_names[n]] = test_piece_rotation
    }
    return rotations
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function clear_complete_rows() {
    let clears = 0
    for(let y=rows-1;y>=0;y--) {
        let completed = true
        for (let x=0;x<columns;x++) {
            if (board[y*columns+x]===blank) {
                completed = false
                break
            }
        }
        if(completed){
            board.splice(y*columns,columns)
            clears += 1
        }
    }
    if (clears>0) {
        let new_lines = new Array(columns*clears).fill(blank)
        board = new_lines.concat(board)
    }
    return clears
}

function lock_piece() {
    let [shape, [spx,spy]] = active_piece
    shape.forEach(block=>{
        board[(spy+block[1])*columns + spx+block[0]] = active_piece_name.toLowerCase()
    })
}

function spawn_piece() {
    if (game_over) return;
    active_piece_r = 0
    let piece_name = seven_bag[0]
    seven_bag.shift()
    if (seven_bag.length===0) {
        seven_bag = shuffle(piece_names.slice())
    }
    active_piece = pieces[piece_name]
    active_piece_name = piece_name
    preview_piece = pieces[piece_name]
    let clears = clear_complete_rows()
    lines_cleared += clears
    score += points[clears]
    $('score').innerHTML = (score).toLocaleString('en-US')
    let eff = ((score/(lines_cleared*300))*100).toFixed(2)
    $('effeciency').innerHTML = eff>=0?eff:0;
    if(check_for_collision(0,0,active_piece[0])[0]) {
        game_over = true;
        setTimeout(()=>{location.reload()},1000)
    }
    move_preview_along()
}

function check_for_collision(x_offset,y_offset,rotated_shape) {
    let [shape, [spx,spy]] = active_piece
    spx+=x_offset
    spy+=y_offset
    for (let i=0;i<rotated_shape.length;i++) {
        let block=rotated_shape[i]
        let tx = spx+block[0]
        let ty = spy+block[1]
        let target = ty*columns + tx
        if(tx<0) return [true, 'left']
        if(tx>columns-1) return [true, 'right']
        if(ty>rows-1) return [true, 'down']
        if(board[target]!==blank) return [true, 'piece']
    }
    return [false, null]
}

function move_preview_along() {
    let [shape, [spx,spy]] = preview_piece
    let y_offset = 0
    while(!check_for_collision(0,y_offset,shape)[0]) {
        y_offset +=1
    }
    preview_piece = [shape,[spx,spy+y_offset-1]]
}

function move(x_offset,y_offset) {
    let [shape, [spx,spy]] = active_piece
    if (check_for_collision(x_offset,y_offset,shape)[0]) {x_offset=0;y_offset=0}
    active_piece = [shape,[spx+x_offset,spy+y_offset]]
    preview_piece = active_piece
    move_preview_along()
    dropCounter = 0
}

function rotate(direction) {
    let [shape, [spx,spy]] = active_piece
    if (active_piece_name==='O') return
    let next_r = (active_piece_r + direction + 4) % 4;
    let next_shape = piece_rotations[active_piece_name][next_r];    
    let [collided, cause] = check_for_collision(0, 0, next_shape);  
    if (!collided) {
        active_piece_r = next_r;
        active_piece = [next_shape, active_piece[1]];
        preview_piece = active_piece;
        move_preview_along();
    }
    dropCounter = 0
}

function hold() {
    if (held_piece===null) {
        held_piece = active_piece
        held_piece_name = active_piece_name
        spawn_piece()
    }
    else {
        let temp_name = held_piece_name
        held_piece = active_piece
        held_piece_name = active_piece_name
        active_piece = pieces[temp_name]
        active_piece_name = temp_name
        preview_piece = active_piece
        move_preview_along()
        active_piece_r = 0
    }
}

window.addEventListener('keydown', (event)=> {
    if (game_over || ai_mode) return;
    if (event.key === 'ArrowRight') move(1,0)
    if (event.key === 'ArrowLeft') move(-1,0)
    if (event.key === 'ArrowDown') move(0,1)
    if (event.key === 'ArrowUp') rotate(2)
    if (event.key === ' ') {
        while(!check_for_collision(0,1,active_piece[0])[0]) move(0,1);
        lock_piece()
        spawn_piece()
    }
    if (event.key === 'C' || event.key === 'c') hold()
    if (event.key === 'Z' || event.key === 'z') rotate(-1)
    if (event.key === 'X' || event.key === 'x') rotate(1)
})

function gameLoop(timestamp = 0) {
    if (game_over) {
        update_board_canvas()
        return
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        tick();
        dropCounter = 0;
    }
    let ai_mode = $('ai_mode').checked
    if(ai_mode) {
        if (best_path===null) {
            hold()
            start_AI()
        } else {
            if (best_path.length>0) {
                for(let i=0;i<moves_per_frame&&best_path.length>0;i++) {
                    let movement = best_path.shift()
                    execute_move(movement)
                }
            } else {
                lock_piece()
                spawn_piece()
                start_AI()
            }
        }
    }
    update_board_canvas()
    requestAnimationFrame(gameLoop);
}

function tick() {
    if(check_for_collision(0,1,active_piece[0])[0]) {
        lock_piece()
        spawn_piece()
    }
    else {
        move(0,1)
    }
}

spawn_piece()
gameLoop()
