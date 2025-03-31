import React from 'react';
import { Button, ButtonGroup } from "@heroui/button";
import { File01Icon } from 'hugeicons-react';
import { Card, CardBody, CardFooter, CardHeader, Divider, Input, Link, Textarea } from '@heroui/react';
import EditableTable from './EditableTable';

function DocumentDetails() {
    const inputProps = {
        labelPlacement: 'inside',
        placeholder: '',
        variant: 'bordered'
    }

    const HeadingTitle = ({ title = "" }) => {
        return (
            <div class="flex flex-row flex-nowrap items-center">
                <span class="flex-none block pe-4 py-2.5 text-md rounded leading-none font-semibold bg-white text-primary">
                    {title}
                </span>
                <span class="flex-grow block border-t border-gray-400"></span>
            </div>
        )
    }
    return (
        <div>
            <Card className='p-4 mt-10'>
                <CardBody>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-primary font-medium text-sm tracking-widest uppercase mb-2">Purchase Order</div>
                            <div className="mt-1">
                                Document Number: <span className="font-medium">12376510</span>
                            </div>
                            <div className="mt-1">
                                Date: <span className="font-medium">1/27/25</span>
                            </div>
                            <div className="mt-1">
                                Status: <span className="font-medium text-green-600"> <File01Icon className='inline -mt-1' size={20} /> Processed</span>
                            </div>
                        </div>

                        <div className='flex flex-row w-auto gap-5'>
                            <Button color='primary'>Create Purchase Order in S/4HANA</Button>
                            <Button>Edit Data</Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card
                classNames={{
                    base: 'mt-10',
                    body: 'px-7 py-5',
                    header: 'px-7'
                }}
            >
                <CardHeader>
                    <div className="text-md font-semibold">Processed Data</div>
                </CardHeader>
                <Divider />
                <CardBody>
                    <HeadingTitle title='Document Information' />

                    <div className='grid grid-cols-4 gap-5 mt-3 mb-8'>
                        <Input label="Document Type" type="text" {...inputProps} />
                        <Input label="Document Number" type="text" {...inputProps} />
                        <Input label="Document Date" type="text" {...inputProps} />
                    </div>


                    <HeadingTitle title='Vendor Information' />

                    <div className='grid grid-cols-4 gap-5 mt-3 mb-8'>
                        <Input label="Vendor Name" type="text" {...inputProps} />
                        <Input label="Contact Info" type="text" {...inputProps} />
                        <div className="col-span-2">
                            <Textarea label="Vendor Address" type="text" {...inputProps} />
                        </div>
                    </div>


                    <HeadingTitle title='Customer Information' />
                    <div className='grid grid-cols-4 gap-5 mt-3 mb-8'>
                        <Input label="Customer Name" type="text" {...inputProps} />
                        <Input label="Contact Info" type="text" {...inputProps} />
                        <div className="col-span-2">
                            <Textarea label="Customer Address" type="text" {...inputProps} />
                        </div>
                    </div>
                    
                    <HeadingTitle title='Amounts' />
                    <div className='grid grid-cols-4 gap-5 mt-3 mb-8'>
                        <Input label="Subtotal" type="text" {...inputProps} startContent="$" />
                        <Input label="Tax" type="text" {...inputProps} startContent="$" />
                        <Input label="Total" type="text" {...inputProps} startContent="$" />
                    </div>
                    
                    <HeadingTitle title='Payment Information' />
                    <div className='grid grid-cols-4 gap-5 mt-3'>
                        <Input label="Payment Terms" type="text" {...inputProps} s/>
                        <Input label="Payment Due Date" type="text" {...inputProps} s/>
                        <Input label="Payment Method" type="text" {...inputProps} s/>
                    </div>

                    <div className="mt-10"></div>

                    <div className="text-sm text-default-600 mb-1">Line Items</div>

                    <EditableTable />
                </CardBody>


            </Card>
        </div>
    );
}

export default DocumentDetails;
