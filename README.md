## REDIS SCHEMA
* game:id
    * player1 -> string
    * player2 -> string
    * owner: -> string

* gamestate:id
    * turn -> string
    * fen -> string
    * previousmove -> json
    * checkmate -> string

* bitboard:id
    * pieces -> string
    * previouspieces -> string