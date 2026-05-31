// const multipliers = {
//     holes:   116.6,
//     height:  10.7,
//     bumps:   63.0,
//     pillars: 5.1,
//     clear:   23.5,
// }
const multipliers = { holes: 648.9, height: 11.8, bumps: 312.2, pillars: 27.2, clear: 130.7 }
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
        let highest_left = x-1>=0?get_heighest_block(x-1,board):999
        let highest_right = x+1<columns?get_heighest_block(x+1,board):999
        let highest_block = get_heighest_block(x,board)
        for (let y=rows;y>0;y--) {
            condition = highest_left-highest_block>1 && highest_right-highest_block>1
            if (condition) {
                pillar_cost += Math.min(highest_left-highest_block,highest_right-highest_block>3)
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
    return pillar_count===1&&holes===0&&pillars_on_edge?[holes,-(Math.min(pillar_cost,4)/6)]:[holes,pillar_cost] // replace denominator with something else
}

function calculate_bumpyness(board) {
    let bump_cost = 0
    for (let x=0;x<columns-1;x++) {
        bump_cost += Math.abs(get_heighest_block(x,board) - get_heighest_block(x+1,board))
    }
    return bump_cost/columns
}