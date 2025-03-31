import React, { useState } from 'react';
import { Button, Input } from '@heroui/react'; // Replace this with the actual HeroUI imports if necessary.
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell
} from "@heroui/table";
import { PlusSignCircleIcon } from 'hugeicons-react';

const EditableTable = () => {
    const [rows, setRows] = useState([
        { id: 1, item: '25H5PC0', description: 'HZ5 Panel CM 4X10 Primed', quantity: 200, unit: 'PC', unitCost: 50, amount: 10000 },
        { id: 2, item: '25H5PC0AW', description: 'HZ5 Panel CM 4X10 Arctic White', quantity: 150, unit: 'PC', unitCost: 66, amount: 9900 },
        { id: 3, item: '25H5PC0GS', description: 'HZ5 Panel CM 4X10 Gray Slate', quantity: 100, unit: 'PC', unitCost: 70, amount: 7000 },
    ]);

    // Handle input change
    const handleInputChange = (id, field, value) => {
        const updatedRows = rows.map((row) =>
            row.id === id
                ? { ...row, [field]: value, amount: field === 'quantity' || field === 'unitCost' ? row.quantity * value || row.unitCost * value : row.amount }
                : row
        );
        setRows(updatedRows);
    };

    // Add a new row
    const handleAddRow = () => {
        setRows([...rows, { id: Date.now(), item: '', description: '', quantity: 0, unit: '', unitCost: 0, amount: 0 }]);
    };

    // Delete a row
    const handleDeleteRow = (id) => {
        setRows(rows.filter((row) => row.id !== id));
    };

    return (
        <div>
            <Table
                classNames={{
                    wrapper: 'p-0',
                    tr: 'border-b-1 border-b-default-100'
                }}
                bordered
            >
                <TableHeader>
                    <TableColumn>Item #</TableColumn>
                    <TableColumn>Description</TableColumn>
                    <TableColumn>Quantity</TableColumn>
                    <TableColumn>Unit</TableColumn>
                    <TableColumn>Unit Cost</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Actions</TableColumn>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <Input
                                    value={row.item}
                                    onChange={(e) => handleInputChange(row.id, 'item', e.target.value)}
                                    placeholder="Item #"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={row.description}
                                    onChange={(e) => handleInputChange(row.id, 'description', e.target.value)}
                                    placeholder="Description"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    value={row.quantity}
                                    onChange={(e) => handleInputChange(row.id, 'quantity', Number(e.target.value))}
                                    placeholder="Quantity"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={row.unit}
                                    onChange={(e) => handleInputChange(row.id, 'unit', e.target.value)}
                                    placeholder="Unit"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    value={row.unitCost}
                                    onChange={(e) => handleInputChange(row.id, 'unitCost', Number(e.target.value))}
                                    placeholder="Unit Cost"
                                />
                            </TableCell>
                            <TableCell>{row.amount.toFixed(2)}</TableCell>
                            <TableCell>
                                <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteRow(row.id)}>
                                    Delete
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="text-center mt-5">
                <Button variant='solid' color='primary' onClick={handleAddRow}><PlusSignCircleIcon /> Add new Line</Button>
            </div>
            {/* <button className="bg-primary text-white py-2 px-4 rounded mt-4" onClick={handleAddRow}>
                Add Row
            </button> */}
        </div>
    );
};

export default EditableTable;
