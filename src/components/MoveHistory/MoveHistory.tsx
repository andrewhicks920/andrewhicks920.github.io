import { useEffect, useRef } from 'react';
import type { MoveRecord } from '../../game/types';
import './MoveHistory.css';

interface Props {
    moves: MoveRecord[];
}

export function MoveHistory({ moves }: Props) {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [moves]);

    return (
        <div className="move-history" ref={listRef}>
            {moves.length === 0 && (
                <div className="move-history-empty">Starting Position</div>
            )}
            {moves.map(record => (
                <div key={record.moveNumber} className="move-row">
                    <span className="move-number">{record.moveNumber}</span>
                    <span className="move-cell move-cell--white">{record.white ?? ''}</span>
                    <span className="move-cell move-cell--black">{record.black ?? ''}</span>
                </div>
            ))}
        </div>
    );
}
