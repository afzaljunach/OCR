import { Button, Card, CardBody, CardHeader, Checkbox, CheckboxGroup, Divider, Drawer, DrawerBody, DrawerContent, DrawerHeader, Input, Textarea, useDisclosure } from '@heroui/react'
import { ArrowRight01Icon, BubbleChatUserIcon, HelpSquareIcon, RightAngleIcon } from 'hugeicons-react'
import React from 'react'

function FeedbackForm() {
    const inputProps = {
        labelPlacement: 'outside',
        placeholder: ' ',
        variant: 'bordered',
        classNames: { label: '!text-foreground-600 text-sm' }
    }

    const { isOpen, onOpen, onClose } = useDisclosure()

    return (
        <>
            <Card
                classNames={{
                    base: 'mt-10 w-full text-start',
                    body: 'px-7 py-5',
                    header: 'px-7'
                }}
                onPress={onOpen}
                isPressable
            >
                <CardHeader className='py-4'>
                    <div className='me-2 text-primary'>
                        <BubbleChatUserIcon size={32} />
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-primary">Extraction Feedback</div>
                        <div className="text-sm text-default-600">Help improve future extractions by providing feedback</div>
                    </div>

                    <div className='ms-auto'>
                        <ArrowRight01Icon />
                    </div>
                </CardHeader>
                {/* <Divider />
                <CardBody>
                    <div className='grid grid-cols-1 gap-5'>
                        <Textarea {...inputProps} label="General Comments" placeholder='Describe any issues with the extraction or provide suggestions for improvement...' />

                        <div>
                            <CheckboxGroup
                                label="Which fields had extraction issues?"
                                orientation="horizontal"
                                size='sm'
                                classNames={{
                                    wrapper: 'gap-3 grid grid-cols-3 w-1/2',
                                    label: inputProps.classNames.label
                                }}
                            >
                                <Checkbox value="document_type">Document Type</Checkbox>
                                <Checkbox value="document_number">Document Number</Checkbox>
                                <Checkbox value="date">Date</Checkbox>
                                <Checkbox value="vendor_information">Vendor Information</Checkbox>
                                <Checkbox value="line_items">Line Items</Checkbox>
                                <Checkbox value="amounts">Amounts</Checkbox>
                            </CheckboxGroup>
                        </div>

                        <Textarea {...inputProps} label="Improved extraction prompt (optional)" placeholder='Suggest a better prompt for extracting this type of document...' />
                    </div>

                    <div className="text-end mt-5">
                        <Button color='primary'>Submit Feedback</Button>
                    </div>
                </CardBody> */}
            </Card>

            <Drawer
                isOpen={isOpen}
                onClose={onClose}
            >
                <DrawerContent>
                    <DrawerHeader>
                        <div className='me-2 text-primary'>
                            <BubbleChatUserIcon size={32} />
                        </div>
                        <div>
                            <div className="text-md font-semibold text-primary">Extraction Feedback</div>
                            <div className="text-xs font-normal text-default-600">Help improve future extractions by providing feedback:</div>
                        </div>
                    </DrawerHeader>
                    <DrawerBody>
                        <div className='grid grid-cols-1 gap-5'>
                            <Textarea minRows={5} {...inputProps} label="General Comments" placeholder='Describe any issues with the extraction or provide suggestions for improvement...' />

                            <div>
                                <CheckboxGroup
                                    label="Which fields had extraction issues?"
                                    size='sm'
                                    classNames={{
                                        label: inputProps.classNames.label
                                    }}
                                >
                                    <Checkbox value="document_type">Document Type</Checkbox>
                                    <Checkbox value="document_number">Document Number</Checkbox>
                                    <Checkbox value="date">Date</Checkbox>
                                    <Checkbox value="vendor_information">Vendor Information</Checkbox>
                                    <Checkbox value="line_items">Line Items</Checkbox>
                                    <Checkbox value="amounts">Amounts</Checkbox>
                                </CheckboxGroup>
                            </div>

                            <Textarea minRows={5} {...inputProps} label="Improved extraction prompt (optional)" placeholder='Suggest a better prompt for extracting this type of document...' />
                        </div>

                        <div className="text-end mt-5">
                            <Button color='primary'>Submit Feedback</Button>
                        </div>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    )
}

export default FeedbackForm